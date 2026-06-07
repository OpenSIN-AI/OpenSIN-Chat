// SPDX-License-Identifier: MIT
import globals from "./server/node_modules/globals/index.js"
import eslintRecommended from "./server/node_modules/@eslint/js/src/index.js"
import eslintConfigPrettier from "./server/node_modules/eslint-config-prettier/index.js"
import prettier from "./server/node_modules/eslint-plugin-prettier/eslint-plugin-prettier.js"
import react from "./server/node_modules/eslint-plugin-react/index.js"
import reactRefresh from "./server/node_modules/eslint-plugin-react-refresh/index.js"
import reactHooks from "./server/node_modules/eslint-plugin-react-hooks/index.js"
import jsxA11y from "./server/node_modules/eslint-plugin-jsx-a11y/lib/index.js"
import ftFlow from "./server/node_modules/eslint-plugin-ft-flow/dist/index.js"
import hermesParser from "./server/node_modules/hermes-eslint/dist/index.js"

const reactRecommended = react.configs.recommended
const jsxRuntime = react.configs["jsx-runtime"]

// Downgrade all jsx-a11y recommended rules from "error" to "warn" so they act as
// non-blocking guidance on the existing component baseline instead of failing the
// lint:check CI gate. New violations surface as warnings during development.
const jsxA11yWarnRules = Object.fromEntries(
  Object.keys(jsxA11y.flatConfigs.recommended.rules).map((rule) => [rule, "warn"])
)

export default [
  eslintRecommended.configs.recommended,
  eslintConfigPrettier,
  {
    ignores: ["**/*.test.js"],
    languageOptions: {
      parser: hermesParser,
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      ecmaVersion: 2020,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.es2020,
        ...globals.node
      }
    },
    linterOptions: { reportUnusedDisableDirectives: true },
    settings: { react: { version: "18.2" } },
    plugins: {
      ftFlow,
      react,
      "jsx-runtime": jsxRuntime,
      "react-hooks": reactHooks,
      prettier
    },
    rules: {
      ...reactRecommended.rules,
      ...reactHooks.configs.recommended.rules,
      ...ftFlow.recommended,
      "no-unused-vars": "warn",
      "no-undef": "warn",
      "no-empty": "warn",
      "no-extra-boolean-cast": "warn",
      "no-prototype-builtins": "off",
      "prettier/prettier": "warn"
    }
  },
  {
    files: ["frontend/src/**/*.js"],
    plugins: {
      ftFlow,
      prettier
    },
    rules: {
      "prettier/prettier": "warn"
    }
  },
  {
    files: [
      "server/endpoints/**/*.js",
      "server/models/**/*.js",
      "server/swagger/**/*.js",
      "server/utils/**/*.js",
      "server/index.js"
    ],
    rules: {
      "no-undef": "warn"
    }
  },
  {
    files: ["frontend/src/**/*.jsx"],
    plugins: {
      ftFlow,
      react,
      "jsx-runtime": jsxRuntime,
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
      "jsx-a11y": jsxA11y,
      prettier
    },
    rules: {
      ...jsxRuntime.rules,
      // Accessibility linting (eslint-plugin-jsx-a11y). Surfaced as warnings so
      // they guide new code toward WCAG-compliant markup without breaking the
      // existing lint:check CI gate on the current 241-component baseline.
      ...jsxA11yWarnRules,
      "jsx-a11y/no-autofocus": "off",
      "react/prop-types": "off", // FIXME
      "react-refresh/only-export-components": "warn"
    }
  }
]
