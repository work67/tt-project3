import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

// TypeScript version note: the workspaces build with TypeScript 7, but typescript-eslint 8.x
// only supports TypeScript < 6.1. The root devDependency `typescript@~6.0` exists only so
// ESLint has a supported compiler for parsing and the type-aware rule below; `tsc` in each
// workspace still uses its own TypeScript 7.
export default tseslint.config(
  { ignores: ['**/dist/**', '**/.wrangler/**'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    rules: {
      // Express error handlers must declare the unused `_next` argument.
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname },
    },
    rules: {
      // Catches async handlers passed where a void callback is expected (e.g. onClick).
      '@typescript-eslint/no-misused-promises': 'error',
    },
  },
  {
    files: ['client/**'],
    extends: [reactHooks.configs.flat.recommended],
    languageOptions: { globals: globals.browser },
  },
  {
    files: ['server/**'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.node },
  },
);
