import { Injectable, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';
import { AuthUser } from '../models/user.model';

export enum Auth {
  ACCESS_TOKEN = 'accessToken',
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  user = signal<AuthUser | null>(null);

  constructor() {
    this.loadUserFromStorage();
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem(Auth.ACCESS_TOKEN);
  }

  storeToken(token: string): void {
    localStorage.setItem(Auth.ACCESS_TOKEN, token);
    this.setUserFromToken(token);
  }

  clearSession(): void {
    localStorage.removeItem(Auth.ACCESS_TOKEN);
    this.user.set(null);
  }

  private loadUserFromStorage(): void {
    const token = localStorage.getItem(Auth.ACCESS_TOKEN);

    if (!token) {
      return;
    }

    this.setUserFromToken(token);
  }

  private setUserFromToken(token: string): void {
    try {
      const decoded = jwtDecode<AuthUser>(token);
      this.user.set(decoded);
    } catch {
      this.clearSession();
    }
  }
}
