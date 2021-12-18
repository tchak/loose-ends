import { createCookieSessionStorage } from 'remix';

import { yearsFromNow } from '~/utils';

if (!process.env.SESSION_SECRET) {
  throw new Error('Missing SESSION_SECRET env');
}

export const sessionStorage = createCookieSessionStorage({
  cookie: {
    name: '__session',
    sameSite: 'lax',
    path: '/',
    httpOnly: true,
    secrets: [process.env.SESSION_SECRET!],
    expires: yearsFromNow(1),
    secure: process.env.NODE_ENV == 'production',
  },
});

export const { getSession, commitSession, destroySession } = sessionStorage;
