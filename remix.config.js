/**
 * @type {import('@remix-run/dev/config').AppConfig}
 */
module.exports = {
  appDirectory: 'app',
  assetsBuildDirectory: 'public/build',
  publicPath: '/build/',
  serverModuleFormat: 'cjs',
  serverPlatform: 'node',
  serverBuildDirectory: 'netlify/functions/server/build',
  devServerBroadcastDelay: 1000,
  ignoredRouteFiles: ['.*'],
};
