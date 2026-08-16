// Adopted 2026-07-16 from the churn preview recorded in
// docs/open-items-audit-2026-07-16.md (Part 2, repo hygiene). The baseline is
// the stock Vite react-template config: @eslint/js recommended + react-hooks
// recommended + react-refresh, with the template's no-unused-vars tweak.
import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist/**', 'archive/**', 'node_modules/**'] },
  {
    files: ['src/**/*.{js,jsx}', 'worker/**/*.js'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: { ...globals.browser, ...globals.node },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,
      'no-unused-vars': ['error', { varsIgnorePattern: '^[A-Z_]' }],
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      // Added 2026-08-11 after a real one. A module-level `const` table in the
      // capture rig referenced another `const` declared forty lines below it,
      // which is a temporal dead zone: the module threw on evaluation and the
      // whole scene rendered nothing. Both builds passed and all 518 tests
      // passed, because neither one evaluates that module. This rule is the
      // thing that catches it, and it found nothing else in the codebase, so it
      // costs nothing to keep.
      //
      // functions and classes stay false: function declarations hoist, and
      // calling one defined further down is normal and safe. `variables: true`
      // is the half that matters, because let and const do not.
      'no-use-before-define': ['error', {
        functions: false,
        classes: false,
        variables: true,
        allowNamedExports: true,
      }],
      // The two React-Compiler-era rules are off, not warn. Every one of their
      // 31 preview hits landed on a documented Cadence pattern (the Rive
      // bounds→aspect read, the getComputedStyle token sync in
      // useMotionTokens, the matchMedia sync, the overlay-gated auto-open
      // Modal, DemoArea's crossfade freeze refs, direction-from-previous-
      // render in ProgressBar/Stepper). Held at warn they would print 31
      // known-fine findings every run and drown real signal. The patterns and
      // their reasoning live in CLAUDE.md and the decision docs it indexes.
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/refs': 'off',
    },
  },
  {
    // Context files export hooks and providers together by convention here;
    // the fast-refresh warning is noise for them, so they are exempt.
    files: ['src/context/**/*.jsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
]
