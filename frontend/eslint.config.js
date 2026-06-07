// SPDX-License-Identifier: MIT
import js from "@eslint/js"
import globals from "globals"
import pluginReact from "eslint-plugin-react"
import pluginReactHooks from "eslint-plugin-react-hooks"
import pluginJsxA11y from "eslint-plugin-jsx-a11y"
import pluginPrettier from "eslint-plugin-prettier"
import configPrettier from "eslint-config-prettier"
import unusedImports from "eslint-plugin-unused-imports"

// Enable the full jsx-a11y recommended set but as warnings, so it surfaces
// accessibility issues in CI without breaking the build on the existing
// backlog. Tighten individual rules to "error" as they get fixed.
const a11yRecommendedAsWarnings = Object.fromEntries(
  Object.keys(pluginJsxA11y.flatConfigs.recommended.rules).map((rule) => [
    rule,
    "warn"
  ])
)

export default [
  {
    ignores: ["**/*.min.js", "src/media/**/*"]
  },

  // Base JS recommended rules
  js.configs.recommended,

  // Your React/JSX files
  {
    files: ["src/**/*.{js,jsx,mjs,cjs}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: { jsx: true }
      },
      globals: globals.browser
    },
    plugins: {
      react: pluginReact,
      "react-hooks": pluginReactHooks,
      "jsx-a11y": pluginJsxA11y,
      "unused-imports": unusedImports,
      prettier: pluginPrettier
    },
    settings: {
      react: { version: "detect" }
    },
    rules: {
      // React recommended rules (inline, since we're not "extending" in flat config)
      ...pluginReact.configs.flat.recommended.rules,

      // If you want hooks rules, add these (recommended)
      ...pluginReactHooks.configs.recommended.rules,

      // Accessibility recommended rules (as warnings, see note above)
      ...a11yRecommendedAsWarnings,

      // Prettier: disable conflicting stylistic rules + optionally enforce formatting
      ...configPrettier.rules,
      "prettier/prettier": "error",

      // Lint-gate: surface any new unsanitized dangerouslySetInnerHTML as a warning.
      // Tighten to "error" once the codebase is fully clean.
      "react/no-danger": "warn",
      // div onClick patterns — warn for now, migrate to buttons/roles incrementally.
      "jsx-a11y/no-static-element-interactions": "warn",
      "jsx-a11y/click-events-have-key-events": "warn",

      // Your overrides
      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/prop-types": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/jsx-no-target-blank": "error",
      "react/no-unescaped-entities": "off",
      "react/display-name": "off",
      "react-hooks/immutability": "off",
      "react-hooks/preserve-manual-memoization": "off",
      "no-extra-boolean-cast": "off",
      "no-prototype-builtins": "off",
      "no-empty": "off",
      "no-useless-escape": "off",
      "no-undef": "error",
      "no-unsafe-optional-chaining": "off",
      "no-constant-binary-expression": "off",

      // Unused cleanup
      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_"
        }
      ]
    }
  }
]
