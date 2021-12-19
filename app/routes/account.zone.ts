import type { LoaderFunction, ActionFunction } from 'remix';
import { redirect, json } from 'remix';
import { z } from 'zod';

const Body = z.object({ timezone: z.string() });

import { authenticator } from '~/auth.server';
import { getSession, commitSession } from '~/session.server';

export const loader: LoaderFunction = () => redirect('/');

export const action: ActionFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/',
  });
  const formData = await request.formData();
  const { timezone } = Body.parse(Object.fromEntries(formData));
  const session = await getSession(request.headers.get('cookie'));
  user.timezone = timezone;
  session.set(authenticator.sessionKey, user);
  const cookie = await commitSession(session);
  return json({ ok: true }, { headers: { 'set-cookie': cookie } });
};
