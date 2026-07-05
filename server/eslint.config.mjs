// SPDX-License-Identifier: MIT
import js from "@eslint/js";
import globals from "globals";
import { defineConfig } from "eslint/config";
import pluginPrettier from "eslint-plugin-prettier";
import configPrettier from "eslint-config-prettier";
import unusedImports from "eslint-plugin-unused-imports";

export default defineConfig([
  {
    ignores: [
      "__tests__/**",
      "**/syncStaticLists.mjs",
      "public/**",
      "coverage/**",
      "storage/**",
      "storage-opensin/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    plugins: { js, prettier: pluginPrettier, "unused-imports": unusedImports },
    extends: ["js/recommended"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
    rules: {
      ...configPrettier.rules,
      "prettier/prettier": "error",
      "no-case-declarations": "off",
      "no-prototype-builtins": "off",
      "no-async-promise-executor": "off",
      "no-extra-boolean-cast": "off",
      "no-empty": "off",
      "no-unused-private-class-members": "warn",
      "no-console": "warn",
      "no-unused-vars": "off",
      // Guard against SQL injection: raw SQL helpers may only receive static
      // SQL strings with `?` placeholders — never interpolated templates or
      // concatenated strings. (Issue #369 raw-SQL audit)
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^\\$(executeRawUnsafe|queryRawUnsafe)$/] > TemplateLiteral.arguments:first-child[expressions.length>0]",
          message:
            "Do not interpolate values into raw SQL. Use `?` placeholders and pass values as parameters (see utils/parseJobs).",
        },
        {
          selector:
            "CallExpression[callee.property.name=/^\\$(executeRawUnsafe|queryRawUnsafe)$/] > BinaryExpression.arguments:first-child[operator='+']",
          message:
            "Do not build raw SQL via string concatenation. Use `?` placeholders and pass values as parameters.",
        },
      ],
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "error",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  { files: ["**/*.js"], languageOptions: { sourceType: "commonjs" } },
]);
