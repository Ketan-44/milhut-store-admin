import { HttpClient, HttpParams } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { ApiResponse } from "src/app/theme/shared/models/response.model";
import {
  PaginatedResult,
  PaginationQuery,
} from "src/app/theme/shared/models/pagination.model";
import { environment } from "src/environments/environment";
import { appendPaginationParams } from 'src/app/theme/shared/utils/pagination-params.util';
import { User } from "../models/user.model";

@Injectable({ providedIn: 'root' })
export class UserService {

    http = inject(HttpClient);

    get(query: PaginationQuery = {}) {
        const params = this.buildParams(query);

        return this.http.get<ApiResponse<PaginatedResult<User>>>(
            `${environment.apiUrl}/user`,
            { params },
        );
    }

    private buildParams(query: PaginationQuery): HttpParams {
        return appendPaginationParams(new HttpParams(), query);
    }
}
