import type { LoaderFunction, ActionFunction, MetaFunction } from 'remix';
import { useLoaderData, Link } from 'remix';
import { MenuIcon } from '@heroicons/react/solid';
import { SkipNavContent } from '@reach/skip-nav';

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
      <div className="flex items-center px-0 py-6">
        <h1 className="flex-grow font-medium">Account</h1>

        <div className="flex items-center">
          <SkipNavContent />
          <Link
            to="/"
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
          >
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Tasks</span>
          </Link>
        </div>
      </div>
      <div className="mb-6">Hello {user.name}!</div>
      <div className="flex flex-col md:flex-row w-56">
        <Link
          to="/signout"
          className="block text-center border hover:bg-slate-300 rounded-md"
        >
          {nbsp('Sign Out')}
        </Link>
        <form method="post">
          <button
            type="submit"
            className="block md:mt-0 mt-3 md:ml-3 w-full hover:bg-red-500 hover:text-white rounded-md"
          >
            {nbsp('Delete Account')}
          </button>
        </form>
      </div>
    </div>
  );
}
