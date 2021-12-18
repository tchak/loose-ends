import type { ActionFunction, LoaderFunction, MetaFunction } from 'remix';

import { authenticator } from '~/auth.server';

export const loader: LoaderFunction = async ({ request }) =>
  authenticator.isAuthenticated(request, {
    successRedirect: '/todos',
  });

export const action: ActionFunction = async ({ request }) =>
  authenticator.authenticate('github', request, {
    successRedirect: '/todos',
    failureRedirect: '/',
  });

export const meta: MetaFunction = () => ({ title: 'Todos' });

export default function IndexRoute() {
  return (
    <div role="main">
      <h1 className="py-6">Todos</h1>
      <form action="/auth/github" method="post">
        <button type="submit">GitHub</button>
      </form>
    </div>
  );
}
