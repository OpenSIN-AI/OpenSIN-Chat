// SPDX-License-Identifier: MIT
// ESLint flat config for the OpenSIN-Chat monorepo.
// Issue #421: Updated ecmaVersion from 2020 to 2022 for modern syntax
// support (top-level await, class fields, private methods, etc.).
import js from "@eslint/js";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import unusedImports from "eslint-plugin-unused-imports";
import reactPlugin from "eslint-plugin-react";
import reactHooksPlugin from "eslint-plugin-react-hooks";
import reactRefreshPlugin from "eslint-plugin-react-refresh";
import jsxAlly from "eslint-plugin-jsx-a11y";
import tsPlugin from "typescript-eslint";

export default [
  {
    ignores: [
      "dist/**",
      "build/**",
      "node_modules/**",
      "coverage/**",
      "server/storage/**",
      "server/vector-cache/**",
      "server/documents/**",
      "frontend/dist/**",
      "frontend/coverage/**",
      "**/*.min.js",
      "jest.config.cjs",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs,jsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        fetch: "readonly",
        crypto: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        queueMicrotask: "readonly",
        AbortController: "readonly",
      },
    },
    plugins: {
      "unused-imports": unusedImports,
      prettier: prettierPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "warn",
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parser: tsPlugin.parser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin.plugin,
      "unused-imports": unusedImports,
      prettier: prettierPlugin,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      "prettier/prettier": "warn",
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "warn",
      "unused-imports/no-unused-vars": [
        "warn",
        { varsIgnorePattern: "^_", argsIgnorePattern: "^_" },
      ],
      "no-console": ["warn", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["frontend/**/*.{js,jsx,ts,tsx}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        window: "readonly",
        document: "readonly",
        navigator: "readonly",
        location: "readonly",
        localStorage: "readonly",
        sessionStorage: "readonly",
        HTMLElement: "readonly",
        HTMLInputElement: "readonly",
        HTMLTextAreaElement: "readonly",
        HTMLButtonElement: "readonly",
        HTMLDivElement: "readonly",
        HTMLCanvasElement: "readonly",
        HTMLImageElement: "readonly",
        HTMLAnchorElement: "readonly",
        Event: "readonly",
        CustomEvent: "readonly",
        MouseEvent: "readonly",
        KeyboardEvent: "readonly",
        FileReader: "readonly",
        FormData: "readonly",
        Blob: "readonly",
        WebSocket: "readonly",
        ResizeObserver: "readonly",
        IntersectionObserver: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        matchMedia: "readonly",
        getComputedStyle: "readonly",
        scrollTo: "readonly",
        alert: "readonly",
        confirm: "readonly",
        prompt: "readonly",
        atob: "readonly",
        btoa: "readonly",
        structuredClone: "readonly",
      },
    },
    plugins: {
      react: reactPlugin,
      "react-hooks": reactHooksPlugin,
      "react-refresh": reactRefreshPlugin,
      "jsx-a11y": jsxAlly,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      ...jsxAlly.configs.recommended.rules,
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "react-refresh/only-export-components": [
        "warn",
        { allowConstantExport: true },
      ],
    },
  },
  {
    files: ["server/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "commonjs",
      globals: {
        require: "readonly",
        module: "readonly",
        exports: "readonly",
        process: "readonly",
        console: "readonly",
        Buffer: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        URL: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        queueMicrotask: "readonly",
      },
    },
  },
  {
    files: [
      "**/*.test.{js,jsx,ts,tsx}",
      "**/*.spec.{js,jsx,ts,tsx}",
    ],
    languageOptions: {
      ecmaVersion: 2022,
      globals: {
        describe: "readonly",
        it: "readonly",
        test: "readonly",
        expect: "readonly",
        beforeEach: "readonly",
        afterEach: "readonly",
        beforeAll: "readonly",
        afterAll: "readonly",
        vi: "readonly",
        jest: "readonly",
        mock: "readonly",
        unmock: "readonly",
        doMock: "readonly",
        dontMock: "readonly",
        setMock: "readonly",
        spyOn: "readonly",
        useFakeTimers: "readonly",
        useRealTimers: "readonly",
        advanceTimersByTime: "readonly",
        getTimerCount: "readonly",
        clearAllMocks: "readonly",
        resetAllMocks: "readonly",
        restoreAllMocks: "readonly",
        fn: "readonly",
        hoisted: "readonly",
      },
    },
    rules: {
      "no-console": "off",
      "unused-imports/no-unused-imports": "off",
    },
  },
];
