import { Authenticator, GitHubStrategy } from 'remix-auth';

import { sessionStorage } from '~/session.server';
import { getTimeZone } from '~/utils';

type User = { id: string; name: string; timezone: string };

if (!process.env.GITHUB_CLIENT_ID) {
  throw new Error('Missing GITHUB_CLIENT_ID env');
}

if (!process.env.GITHUB_CLIENT_SECRET) {
  throw new Error('Missing GITHUB_CLIENT_SECRET env');
}

if (!process.env.GITHUB_CALLBACK_URL) {
  throw new Error('Missing GITHUB_CALLBACK_URL env');
}

export const authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new GitHubStrategy(
    {
      clientID: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      callbackURL: process.env.GITHUB_CALLBACK_URL!,
    },
    async (_accessToken, _refreshToken, _params, profile) => {
      return {
        id: profile.id,
        name: profile.displayName,
        timezone: getTimeZone(),
      };
    }
  )
);
