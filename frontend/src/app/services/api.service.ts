import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    role: string;
    createdAt: string;
  };
  token: string;
}

export interface HotelPayload {
  name: string;
  slug: string;
  description: string;
  bannerUrl: string;
  callbackUrl: string;
  rewards?: {
    credits?: number;
    diamonds?: number;
    duckets?: number;
  };
}

export interface UploadResponse {
  key: string;
  url: string;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private readonly baseUrl = environment.apiBaseUrl;

  constructor(private readonly http: HttpClient) {}

  // Auth
  register(payload: { username: string; email: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/register`, payload);
  }

  login(payload: { email?: string; username?: string; password: string }): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.baseUrl}/auth/login`, payload);
  }

  // Hotels
  getHotels(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/hotels`);
  }

  getHotel(idOrSlug: string): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/hotels/${idOrSlug}`);
  }

  createHotel(payload: HotelPayload): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/hotels`, payload);
  }

  updateHotel(id: string, payload: Partial<HotelPayload> & { views?: number }): Observable<any> {
    return this.http.put<any>(`${this.baseUrl}/hotels/${id}`, payload);
  }

  deleteHotel(id: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/hotels/${id}`);
  }

  uploadHabboBanner(file: File): Observable<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UploadResponse>(`${this.baseUrl}/uploads/habbo/banner`, formData);
  }

  deleteHabboBanner(keyOrUrl: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/uploads/habbo/banner`, {
      body: { key: keyOrUrl }
    });
  }

  // User settings
  updateProfile(payload: { username?: string; email?: string }) {
    return this.http.put<any>(`${this.baseUrl}/users/me`, payload);
  }

  updatePassword(payload: { currentPassword: string; newPassword: string }) {
    return this.http.put<any>(`${this.baseUrl}/users/me/password`, payload);
  }

  deleteAccount() {
    return this.http.delete<any>(`${this.baseUrl}/users/me`);
  }
}
