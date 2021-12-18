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
} from 'remix';
import type { LoaderFunction, LinksFunction, ThrownResponse } from 'remix';
import { ReactNode } from 'react';

import tailwindUrl from '~/styles/tailwind.css';
import { authenticator } from '~/auth.server';

export const links: LinksFunction = () => {
  return [
    { rel: 'stylesheet', href: tailwindUrl },
    {
      rel: 'stylesheet',
      href: 'https://fonts.googleapis.com/css2?family=Short+Stack&display=swap',
    },
    {
      rel: 'stylesheet',
      href: 'doodle/doodle.css',
    },
    {
      rel: 'stylesheet',
      href: 'https://unpkg.com/@reach/menu-button@0.16.2/styles.css',
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

export const loader: LoaderFunction = async ({ request }) => {
  const user = await authenticator.isAuthenticated(request);
  return { account: !!user };
};

export const unstable_shouldReload = () => false;

export default function App() {
  const { account } = useLoaderData<{ account: boolean }>();
  return (
    <Document account={account}>
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
  account = false,
}: {
  children: React.ReactNode;
  title?: string;
  account?: boolean;
}) {
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
        <Layout account={account}>{children}</Layout>
        <ScrollRestoration />
        <Scripts />
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
  account,
  children,
}: {
  account: boolean;
  children: ReactNode;
}) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto text-xl">
        {children}
        <footer className="my-8 text-xs">
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
          {account ? (
            <>
              {' | '}
              <Link to="/account" className="underline">
                Account
              </Link>
            </>
          ) : null}
        </footer>
      </div>
    </div>
  );
}
