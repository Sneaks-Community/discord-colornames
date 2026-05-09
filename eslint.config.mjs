// @ts-check
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import unicorn from 'eslint-plugin-unicorn';
import perfectionist from 'eslint-plugin-perfectionist';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  unicorn.configs.recommended,
  {
    files: ['**/*.ts'],
    plugins: {
      perfectionist,
    },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'perfectionist/sort-imports': [
        'error',
        {
          type: 'natural',
          order: 'asc',
          newlinesBetween: 'ignore',
          groups: [
            'type-import',
            ['value-builtin', 'value-external'],
            'type-internal',
            'value-internal',
            ['type-parent', 'type-sibling', 'type-index'],
            ['value-parent', 'value-sibling', 'value-index'],
            'ts-equals-import',
            'unknown',
          ],
          internalPattern: ['^~/.+'],
        },
      ],
      'perfectionist/sort-objects': ['error', { type: 'natural' }],
      // Relax some unicorn rules that are too strict for bot code
      'unicorn/prevent-abbreviations': 'off',
      'unicorn/no-process-exit': 'off',
      'unicorn/prefer-top-level-await': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'coverage/'],
  },
);
