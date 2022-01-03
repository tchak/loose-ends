import {
  Links,
  LiveReload,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  useCatch,
  Link,
  useLoaderData,
  useFetcher,
  useMatches,
} from 'remix';
import type {
  LoaderFunction,
  LinksFunction,
  ThrownResponse,
  ShouldReloadFunction,
  MetaFunction,
} from 'remix';
import { ReactNode } from 'react';
import { timeZonesNames } from '@vvo/tzdb';
import { SkipNavLink } from '@reach/skip-nav';

import tailwindUrl from '~/styles/tailwind.css';
import { authenticator } from '~/auth.server';
import { getTimeZone } from '~/utils';

export const meta: MetaFunction = () => ({
  'theme-color': '#FDF7F1',
  description: 'A simple todo app',
});

export const links: LinksFunction = () => {
  return [
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Short+Stack&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'https://unpkg.com/@reach/menu-button@0.16.2/styles.css',
    },
    {
      rel: 'stylesheet',
      href: 'https://unpkg.com/@reach/skip-nav@0.16.0/styles.css',
    },
    { rel: 'stylesheet', href: tailwindUrl },
    {
      rel: 'stylesheet',
      href: 'doodle/doodle.css',
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png',
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png',
    },
    {
      rel: 'manifest',
      href: '/site.webmanifest',
    },
  ];
};

type LoaderData = {
  isAuthenticated: boolean;
  timezone: string;
};

export const loader: LoaderFunction = async ({
  request,
}): Promise<LoaderData> => {
  const user = await authenticator.isAuthenticated(request);
  return { isAuthenticated: !!user, timezone: user?.timezone ?? getTimeZone() };
};

export const unstable_shouldReload: ShouldReloadFunction = () => false;

export default function App() {
  const { isAuthenticated, timezone } = useLoaderData<LoaderData>();
  return (
    <Document isAuthenticated={isAuthenticated} timezone={timezone}>
      <SkipNavLink className="rounded-md underline shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500" />
      <Outlet />
    </Document>
  );
}

export function ErrorBoundary({ error }: { error: Error }) {
  console.error(error);
  return (
    <Document title="Error!">
      <div role="main">
        <h1 className="py-6">There was an error</h1>
        <p>{error.message}</p>
        <hr />
        <p>
          Hey, developer, you should replace this with what you want your users
          to see.
        </p>
      </div>
    </Document>
  );
}

export function CatchBoundary() {
  const caught = useCatch();

  return (
    <Document title={`${caught.status} ${caught.statusText}`}>
      <div role="main">
        <h1 className="py-6">
          {caught.status}: {caught.statusText}
        </h1>
        <p>{caughtMessage(caught)}</p>
      </div>
    </Document>
  );
}

function Document({
  children,
  title,
  isAuthenticated = false,
  timezone = getTimeZone(),
}: {
  children: React.ReactNode;
  title?: string;
  isAuthenticated?: boolean;
  timezone?: string;
}) {
  const matches = useMatches();
  const includeScripts = matches.at(-1)?.handle?.hydrate != false;
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width,initial-scale=1" />
        {title ? <title>{title}</title> : null}
        <Meta />
        <Links />
      </head>
      <body className="font-body doodle">
        <Layout isAuthenticated={isAuthenticated} timezone={timezone}>
          {children}
        </Layout>
        <ScrollRestoration />
        {includeScripts ? <Scripts /> : null}
        {process.env.NODE_ENV == 'development' && <LiveReload />}
      </body>
    </html>
  );
}

function caughtMessage(caught: ThrownResponse) {
  switch (caught.status) {
    case 401:
      return 'Oops! Looks like you tried to visit a page that you do not have access to.';
    case 404:
      return 'Oops! Looks like you tried to visit a page that does not exist.';
    default:
      throw new Error(caught.data || caught.statusText);
  }
}

function Layout({
  isAuthenticated,
  timezone,
  children,
}: {
  isAuthenticated: boolean;
  timezone: string;
  children: ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-xl">
        {children}
        <footer className="my-8 text-xs flex flex-col-reverse items-start md:items-center md:flex-row md:justify-between">
          <div className="mt-3 md:mt-0">
            <a
              href="https://chr15m.github.io/DoodleCSS/"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              CSS
            </a>
            {' | '}
            <a
              href="https://remix.run"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              JS
            </a>
            {' | '}
            <a
              href="https://supabase.com"
              target="_blank"
              rel="noopener"
              className="underline"
            >
              DB
            </a>
            {isAuthenticated ? (
              <>
                {' | '}
                <Link to="/stats" className="underline">
                  Stats
                </Link>
                {' | '}
                <Link to="/account" className="underline">
                  Account
                </Link>
              </>
            ) : null}
          </div>
          {isAuthenticated ? (
            <TimezoneSelect timezone={timezone} />
          ) : (
            <span>{timezone}</span>
          )}
        </footer>
      </div>
    </div>
  );
}

function TimezoneSelect({ timezone }: { timezone: string }) {
  const fetcher = useFetcher();
  return (
    <select
      aria-label="Select preferred Timezone"
      className="appearance-none rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-gray-500"
      defaultValue={timezone}
      onChange={({ currentTarget: { value } }) => {
        fetcher.submit(
          { timezone: value },
          { action: '/account/zone', method: 'post', replace: true }
        );
      }}
    >
      {timeZonesNames.map((zoneName) => (
        <option key={zoneName}>{zoneName}</option>
      ))}
    </select>
  );
}

if (!Array.prototype.at) {
  Array.prototype.at = function at(index: number) {
    const k = index >= 0 ? index : this.length + index;
    return this[k];
  };
}
