import { ApplicationConfig } from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { authInterceptor } from './theme/shared/interceptors/auth.interceptor';
import { responseInterceptor } from './theme/shared/interceptors/response.interceptor';


export const appConfig: ApplicationConfig = {
    providers: [
        // Register the HttpClient with the functional interceptor chain
        provideHttpClient(
            withInterceptors([authInterceptor, responseInterceptor])
        )
    ]
};