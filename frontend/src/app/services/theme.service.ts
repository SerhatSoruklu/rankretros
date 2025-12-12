import { Injectable } from '@angular/core';

export type ThemeMode = 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly storageKey = 'rankretros-theme';
  private current: ThemeMode = 'light';

  constructor() {
    const saved = (localStorage.getItem(this.storageKey) as ThemeMode | null) || 'light';
    this.setTheme(saved);
  }

  get theme(): ThemeMode {
    return this.current;
  }

  toggle() {
    this.setTheme(this.current === 'light' ? 'dark' : 'light');
  }

  setTheme(mode: ThemeMode) {
    this.current = mode;
    localStorage.setItem(this.storageKey, mode);
    const root = document.documentElement;
    root.classList.remove('theme-light', 'theme-dark');
    root.classList.add(mode === 'light' ? 'theme-light' : 'theme-dark');
  }
}
