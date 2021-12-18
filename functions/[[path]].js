import { createPagesFunctionHandler } from '@remix-run/cloudflare-pages';

// @ts-ignore
import * as build from '../netlify/functions/server/build';

const handleRequest = createPagesFunctionHandler({
  build,
});

export function onRequest(context) {
  return handleRequest(context);
}
