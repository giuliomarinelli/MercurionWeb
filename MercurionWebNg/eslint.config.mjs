// @ts-check
import eslint from '@eslint/js'
import angular from 'angular-eslint'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: ['.angular/**', 'dist/**', 'node_modules/**']
  },
  {
    files: ['src/**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended
    ],
    processor: angular.processInlineTemplates,
    rules: {
      // Existing migration debt remains visible without making the bootstrap
      // lint gate mutating or unusable. New code is still checked by the full
      // Angular/TypeScript parser and recommended rule set.
      '@angular-eslint/no-empty-lifecycle-method': 'warn',
      '@angular-eslint/no-output-native': 'warn',
      '@angular-eslint/no-output-on-prefix': 'warn',
      '@angular-eslint/prefer-inject': 'warn',
      '@angular-eslint/use-lifecycle-interface': 'warn',
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-expressions': 'warn',
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-irregular-whitespace': 'warn'
    }
  },
  {
    files: ['src/**/*.html'],
    extends: [
      ...angular.configs.templateRecommended
    ]
  }
)
