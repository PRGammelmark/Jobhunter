import type { CookieOptions, Response } from 'express';
import { config } from '../config';

export const AUTH_COOKIE_NAME = 'auth_token';
export const CSRF_COOKIE_NAME = 'csrf';

export const authCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: config.isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 12 * 60 * 60 * 1000,
};

export const csrfCookieOptions: CookieOptions = {
  httpOnly: false,
  secure: config.isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: 12 * 60 * 60 * 1000,
};

export function setAuthCookie(res: Response, token: string): void {
  res.cookie(AUTH_COOKIE_NAME, token, authCookieOptions);
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: authCookieOptions.httpOnly,
    secure: authCookieOptions.secure,
    sameSite: authCookieOptions.sameSite,
    path: authCookieOptions.path,
  });
}

export function setCsrfCookie(res: Response, token: string): void {
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions);
}

export function clearCsrfCookie(res: Response): void {
  res.clearCookie(CSRF_COOKIE_NAME, {
    httpOnly: csrfCookieOptions.httpOnly,
    secure: csrfCookieOptions.secure,
    sameSite: csrfCookieOptions.sameSite,
    path: csrfCookieOptions.path,
  });
}
