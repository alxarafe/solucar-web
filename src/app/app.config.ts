import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { routes } from './app.routes';
import { acceptLanguageInterceptor } from './core/api/accept-language.interceptor';
import { AuthSessionService } from './core/auth/auth-session.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
    provideAppInitializer(() => {
      // Render the loading state while the bounded session lookup is pending.
      void inject(AuthSessionService).bootstrap();
    }),
  ],
};
