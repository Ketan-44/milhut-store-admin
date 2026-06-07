import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { LoginModel } from "../models/auth.model";
import { environment } from "src/environments/environment";
import { ApiResponse } from "src/app/theme/shared/models/response.model";

// auth.service.ts
@Injectable({ providedIn: 'root' })
export class AuthenticationService {
    constructor(private http: HttpClient) { }

    login(data: LoginModel) {
        return this.http.post<ApiResponse<string>>(
            `${environment.apiUrl}/auth/login`,
            data
        );
    }
}