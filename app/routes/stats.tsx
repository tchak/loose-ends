import type { LoaderFunction, MetaFunction } from 'remix';
import { useLoaderData, useSearchParams, Link } from 'remix';
import { Duration } from 'luxon';
import { MenuIcon } from '@heroicons/react/solid';
import { z } from 'zod';
import { SkipNavContent } from '@reach/skip-nav';
import clsx from 'clsx';

import { authenticator } from '~/auth.server';
import { getStats, Stats } from '~/db.server';

const Scopes = z.object({
  stats: z.enum(['overall', 'today']).default('overall'),
  done: z.enum(['week', 'month', 'year']).default('week'),
  focused: z.enum(['week', 'month', 'year']).default('week'),
});

function getScopes(request: Request) {
  const url = new URL(request.url);
  return Scopes.parse(Object.fromEntries(url.searchParams));
}

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request, {
    failureRedirect: '/',
  });
  const scopes = getScopes(request);
  return getStats({ userId: user.id, scopes });
};

export const meta: MetaFunction = () => ({ title: 'Account' });

export const handle = { hydrate: false };

export default function StatsRoute() {
  const [params] = useSearchParams();
  const { stats, done, focused } = useLoaderData<Stats>();

  const pathWithFilter = (name: string, value: string) => {
    const searchParams = new URLSearchParams(params);
    searchParams.set(name, value);
    searchParams.sort();
    return `?${searchParams.toString()}`;
  };

  return (
    <div role="main">
      <div className="flex items-center px-0 py-6">
        <h1 className="flex-grow font-medium">Stats</h1>

        <div className="flex items-center">
          <Link
            to="/"
            className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
          >
            <MenuIcon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">Tasks</span>
          </Link>
        </div>
      </div>

      <div className="border my-6">
        <SkipNavContent />
        <div className="flex justify-around">
          <figure className="text-center p-3">
            <div className="p-4">{stats.done}</div>
            <figcaption className="text-base">Task Done</figcaption>
          </figure>
          <figure className="text-center p-3">
            <time className="p-4 block" dateTime={stats.focused}>
              {Duration.fromISO(stats.focused).toFormat("h'h' mm'm'")}
            </time>
            <figcaption className="text-base">Focused</figcaption>
          </figure>
        </div>
        <div className="flex text-sm justify-end mt-4">
          <Link
            to={pathWithFilter('stats', 'overall')}
            className={clsx(
              { 'bg-slate-300': stats.scope == 'overall' },
              'border rounded-md hover:bg-slate-300'
            )}
          >
            Overall
          </Link>
          <Link
            to={pathWithFilter('stats', 'today')}
            className={clsx(
              { 'bg-slate-300': stats.scope == 'today' },
              'border ml-2 rounded-md hover:bg-slate-300'
            )}
          >
            Today
          </Link>
        </div>
      </div>

      <div className="border my-6">
        <h2>Task Done</h2>
        <div className="flex text-sm justify-end mt-4">
          <Link
            to={pathWithFilter('done', 'week')}
            className={clsx(
              { 'bg-slate-300': done.scope == 'week' },
              'border rounded-md hover:bg-slate-300'
            )}
          >
            Week
          </Link>
          <Link
            to={pathWithFilter('done', 'month')}
            className={clsx(
              { 'bg-slate-300': done.scope == 'month' },
              'border ml-2 rounded-md hover:bg-slate-300'
            )}
          >
            Month
          </Link>
          <Link
            to={pathWithFilter('done', 'year')}
            className={clsx(
              { 'bg-slate-300': done.scope == 'year' },
              'border ml-2 rounded-md hover:bg-slate-300'
            )}
          >
            Year
          </Link>
        </div>
      </div>

      <div className="border my-6">
        <h2>Focused</h2>
        <div className="flex text-sm justify-end mt-4">
          <Link
            to={pathWithFilter('focused', 'week')}
            className={clsx(
              { 'bg-slate-300': focused.scope == 'week' },
              'border rounded-md '
            )}
          >
            Week
          </Link>
          <Link
            to={pathWithFilter('focused', 'month')}
            className={clsx(
              { 'bg-slate-300': focused.scope == 'month' },
              'border ml-2 rounded-md hover:bg-slate-300'
            )}
          >
            Month
          </Link>
          <Link
            to={pathWithFilter('focused', 'year')}
            className={clsx(
              { 'bg-slate-300': focused.scope == 'year' },
              'border ml-2 rounded-md hover:bg-slate-300'
            )}
          >
            Year
          </Link>
        </div>
      </div>
    </div>
  );
}
