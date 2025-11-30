import { Injectable } from '@angular/core';
import { BehaviorSubject, tap } from 'rxjs';
import { ApiService, AuthResponse } from './api.service';

export interface AuthState {
  user: AuthResponse['user'] | null;
  token: string | null;
}

const TOKEN_KEY = 'rankretros_token';
const USER_KEY = 'rankretros_user';
const EMAIL_KEY = 'rankretros_email';
const AUTH_FLAG = 'rankretros_auth';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly state$ = new BehaviorSubject<AuthState>({
    user: this.loadUser(),
    token: this.loadToken()
  });

  readonly user$ = this.state$.asObservable();

  constructor(private readonly api: ApiService) {}

  get token(): string | null {
    return this.state$.value.token;
  }

  get user() {
    return this.state$.value.user;
  }

  register(payload: { username: string; email: string; password: string }) {
    return this.api.register(payload).pipe(tap((res) => this.setAuth(res)));
  }

  login(payload: { email?: string; username?: string; password: string }) {
    return this.api.login(payload).pipe(tap((res) => this.setAuth(res)));
  }

  logout() {
    this.state$.next({ user: null, token: null });
    localStorage.removeItem(TOKEN_KEY);
    this.clearTokenCookie();
    this.clearUserCookie();
    this.clearAuthCookie();
    this.clearAllCookies();
  }

  updateUser(user: AuthResponse['user']) {
    this.state$.next({ user, token: this.state$.value.token });
    this.setUserCookie(user.username);
    this.setEmailCookie(user.email || '');
    this.setAuthCookie(true);
  }

  private setAuth(res: AuthResponse) {
    this.state$.next({ user: res.user, token: res.token });
    localStorage.setItem(TOKEN_KEY, res.token);
    this.setTokenCookie(res.token);
    this.setUserCookie(res.user.username);
    this.setEmailCookie(res.user.email || '');
    this.setAuthCookie(true);
  }

  private loadToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  private loadUser(): AuthResponse['user'] | null {
    const username = this.getCookie(USER_KEY);
    const email = this.getCookie(EMAIL_KEY) || '';
    if (!username) return null;
    return {
      id: '',
      username,
      email,
      role: 'user',
      createdAt: ''
    };
  }

  private setTokenCookie(token: string) {
    const days = 7;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${TOKEN_KEY}=${token}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private clearTokenCookie() {
    document.cookie = `${TOKEN_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  private setUserCookie(username: string) {
    const days = 7;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${USER_KEY}=${encodeURIComponent(username)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private setEmailCookie(email: string) {
    const days = 7;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${EMAIL_KEY}=${encodeURIComponent(email)}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private getCookie(name: string): string | null {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop()!.split(';').shift()!);
    return null;
  }

  private clearUserCookie() {
    document.cookie = `${USER_KEY}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  private setAuthCookie(isAuthed: boolean) {
    const days = 7;
    const expires = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = `${AUTH_FLAG}=${isAuthed ? 'true' : 'false'}; expires=${expires}; path=/; SameSite=Lax`;
  }

  private clearAuthCookie() {
    document.cookie = `${AUTH_FLAG}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }

  // Best-effort wipe of our cookies
  private clearAllCookies() {
    const names = [TOKEN_KEY, USER_KEY, AUTH_FLAG, EMAIL_KEY];
    const domains = [undefined, window.location.hostname, 'localhost'];
    names.forEach((name) => {
      domains.forEach((domain) => {
        const domainPart = domain ? `; domain=${domain}` : '';
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; Max-Age=0; path=/; SameSite=Lax${domainPart}`;
      });
    });
  }
}
