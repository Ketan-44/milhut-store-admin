import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideToastr } from 'ngx-toastr';
import { authInterceptor } from './theme/shared/interceptors/auth.interceptor';
import { responseInterceptor } from './theme/shared/interceptors/response.interceptor';


export const appConfig: ApplicationConfig = {
    providers: [
        provideAnimations(),
        provideToastr({
            timeOut: 3000,
            positionClass: 'toast-top-right',
            preventDuplicates: true,
        }),
        provideHttpClient(
            withInterceptors([authInterceptor, responseInterceptor])
        )
    ]
};