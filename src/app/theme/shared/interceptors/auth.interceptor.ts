import { HttpInterceptorFn } from "@angular/common/http";
import { Auth } from "../services/auth.service";

export const authInterceptor: HttpInterceptorFn = (
    req,
    next
) => {
    const token = localStorage.getItem(Auth.ACCESS_TOKEN);

    if (token) {
        req = req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`,
            },
        });
    }

    return next(req);
};