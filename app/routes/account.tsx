import type { LoaderFunction, ActionFunction, MetaFunction } from 'remix';
import { useLoaderData, Link, redirect } from 'remix';

import { authenticator } from '~/auth.server';
import { nbsp } from '~/utils';
import { executeCommand } from '~/db.server';

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/',
  });

  return { user };
};

export const action: ActionFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/',
  });
  const formData = await request.formData();
  return executeCommand(formData, { userId: user.id });
};

export const meta: MetaFunction = () => ({ title: 'Account' });

export default function AccountRoute() {
  const { user } = useLoaderData<{ user: { name: string } }>();
  return (
    <div role="main">
      <h1 className="py-6">Account</h1>
      <div className="mb-6">Hello {user.name}!</div>
      <div className="flex flex-col md:flex-row w-56">
        <Link to="/todos" className="block text-center doodle-border">
          Todos
        </Link>
        <Link
          to="/signout"
          className="block mt-3 md:mt-0 md:ml-3 text-center doodle-border"
        >
          {nbsp('Sign Out')}
        </Link>
        <form method="post">
          <button type="submit" className="block md:mt-0 mt-3 md:ml-3 w-full">
            {nbsp('Delete Account')}
          </button>
        </form>
      </div>
    </div>
  );
}
