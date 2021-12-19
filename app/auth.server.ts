import { Authenticator } from 'remix-auth/build/authenticator';
import { GitHubStrategy } from 'remix-auth/build/strategies/github';

import { sessionStorage } from '~/session.server';
import { getTimeZone, getEnv } from '~/utils';

type User = { id: string; name: string; timezone: string };

export const authenticator = new Authenticator<User>(sessionStorage);

authenticator.use(
  new GitHubStrategy(
    {
      clientID: getEnv('GITHUB_CLIENT_ID'),
      clientSecret: getEnv('GITHUB_CLIENT_SECRET'),
      callbackURL: getEnv('GITHUB_CALLBACK_URL'),
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
