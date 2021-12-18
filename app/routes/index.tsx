import type { LoaderFunction, MetaFunction } from 'remix';
import { useTransition, Form } from 'remix';

import { authenticator } from '~/auth.server';

export const loader: LoaderFunction = async ({ request }) =>
  authenticator.isAuthenticated(request, {
    successRedirect: '/todos',
  });

export const meta: MetaFunction = () => ({ title: 'Todos' });

export default function IndexRoute() {
  const transition = useTransition();
  const connecting = transition.type == 'actionSubmission';

  return (
    <div role="main">
      <h1 className="py-6">Todos</h1>
      <Form action="/auth/github" method="post">
        <button type="submit" disabled={connecting}>
          {connecting ? 'Connecting with GitHub...' : 'Continue with GitHub'}
        </button>
      </Form>
    </div>
  );
}
