import { Injectable } from '@angular/core';

export enum Auth {
    ACCESS_TOKEN = "accessToken"
}

@Injectable({
    providedIn: 'root',
})
export class AuthService {
    isAuthenticated(): boolean {
        return !!localStorage.getItem(Auth.ACCESS_TOKEN);
    }

    storeToken(token: string) {
        localStorage.setItem(Auth.ACCESS_TOKEN, token);
    }
}