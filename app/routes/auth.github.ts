import type { ActionFunction, LoaderFunction } from 'remix';
import { redirect } from 'remix';
import { authenticator } from '~/auth.server';

export const loader: LoaderFunction = () => redirect('/');
export const action: ActionFunction = async ({ request }) =>
  authenticator.authenticate('github', request);
