import { createCookieSessionStorage } from 'remix';

import { yearsFromNow, getEnv } from '~/utils';

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [getEnv('SESSION_SECRET')],
    expires: yearsFromNow(1),
    secure: process.env.NODE_ENV == 'production',
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
