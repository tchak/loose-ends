import type { LoaderFunction } from 'remix';
import { redirect } from 'remix';

import { getSession, destroySession } from '~/session.server';

export const loader: LoaderFunction = async ({ request }) => {
  const session = await getSession(request.headers.get('cookie'));
  const cookie = await destroySession(session);
  return redirect('/', { headers: { 'set-cookie': cookie } });
};
