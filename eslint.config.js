// SPDX-License-Identifier: MIT
import globals from "globals";
import eslintRecommended from "@eslint/js";
import eslintConfigPrettier from "eslint-config-prettier";
import prettier from "eslint-plugin-prettier";
import react from "eslint-plugin-react";
import reactRefresh from "eslint-plugin-react-refresh";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

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
    languageOptions: {
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      ecmaVersion: "latest",
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
      react,
      "jsx-runtime": jsxRuntime,
      "react-hooks": reactHooks,
      prettier
    },
    rules: {
      ...reactRecommended.rules,
      ...reactHooks.configs.recommended.rules,
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
