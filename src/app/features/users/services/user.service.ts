import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { ApiResponse } from "src/app/theme/shared/models/response.model";
import { environment } from "src/environments/environment";
import { User } from "../models/user.model";

// auth.service.ts
@Injectable({ providedIn: 'root' })
export class UserService {

    http = inject(HttpClient);

    get() {
        return this.http.get<ApiResponse<User[]>>(
            `${environment.apiUrl}/user`,
        );
    }
}