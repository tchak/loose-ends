module.exports = {
  root: true,
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
    'prettier',
  ],
  rules: {},
  overrides: [
    {
      files: ['remix.config.js', 'tailwind.config.js'],
      env: { node: true },
    },
  ],
};
