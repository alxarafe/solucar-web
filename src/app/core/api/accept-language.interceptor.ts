import { Injectable, inject } from '@angular/core';
import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
} from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';

export const acceptLanguageInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const localeId = inject(LOCALE_ID);
  const isApiRequest = req.url.startsWith('/api/');

  if (!isApiRequest) {
    return next(req);
  }

  const language = localeId.split('-')[0];
  const modifiedReq = req.clone({
    setHeaders: {
      'Accept-Language': language,
    },
  });

  return next(modifiedReq);
};