import {
    HttpErrorResponse,
    HttpInterceptorFn,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { Auth } from '../services/auth.service';

export const responseInterceptor: HttpInterceptorFn = (
    req,
    next
) => {
    const router = inject(Router);

    return next(req).pipe(
        catchError((error: HttpErrorResponse) => {
            switch (error.status) {
                case 401:
                    localStorage.removeItem(Auth.ACCESS_TOKEN);
                    router.navigate(['/login']);
                    break;

                case 403:
                    console.error('Access denied');
                    break;

                case 404:
                    console.error('Resource not found');
                    break;

                case 500:
                    console.error('Server error');
                    break;
            }

            const message =
                error.error?.message ||
                error.message ||
                'Something went wrong';

            return throwError(() => ({
                status: error.status,
                message,
            }));
        })
    );
};