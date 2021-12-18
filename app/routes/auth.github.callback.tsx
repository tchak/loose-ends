import type { LoaderFunction } from 'remix';
import { authenticator } from '~/auth.server';

export const loader: LoaderFunction = ({ request }) =>
  authenticator.authenticate('github', request, {
    successRedirect: '/todos',
    failureRedirect: '/',
  });
