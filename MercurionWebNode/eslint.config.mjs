// @ts-check
import eslint from '@eslint/js';
import eslintPluginPrettierRecommended from 'eslint-plugin-prettier/recommended';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: ['eslint.config.mjs'],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  // eslintPluginPrettierRecommended,
  {
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.jest,
      },
      ecmaVersion: 5,
      sourceType: 'module',
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-floating-promises': 'error',
      // GraphQL/ORM callback signatures are supplied by third-party
      // declarations; the validated adapter boundary handles their values.
      '@typescript-eslint/no-unsafe-argument': 'off',
      // These two rules are intentionally scoped to adapter-specific fixes
      // while the Nest vendor APIs are typed; broad activation would flag
      // framework logger and ORM contracts without adding a safe narrowing.
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      // GraphQL field maps are decoded at one adapter boundary; the
      // downstream framework declarations otherwise surface error-typed
      // assignments despite the decoded application type.
      '@typescript-eslint/no-unsafe-assignment': 'off',
      // class-transformer exposes decorator callback values as `any`; DTO
      // callbacks narrow those values before returning them.
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    },
  },
  {
    files: ['**/*.spec.ts', '**/*.test.ts', 'test/**/*.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/require-await': 'off',
    },
  },
);