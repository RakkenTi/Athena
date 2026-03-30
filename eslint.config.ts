import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig } from 'eslint/config'
import unusedImports from 'eslint-plugin-unused-imports'

export default defineConfig([
    {
        ignores: ['**/dist/**', '**/node_modules/**', '**/temp/**', 'out/**'],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        plugins: {
            'unused-imports': unusedImports,
        },
        languageOptions: {
            globals: {
                ...globals.browser,
                ...globals.node,
            },
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': 'off',
            'unused-imports/no-unused-imports': 'error',
            'unused-imports/no-unused-vars': [
                'warn',
                {
                    vars: 'all',
                    varsIgnorePattern: '^_',
                    args: 'after-used',
                    argsIgnorePattern: '^_',
                },
            ],

            '@typescript-eslint/no-explicit-any': 'off',
            'no-useless-escape': 'off',
        },
    },
])
