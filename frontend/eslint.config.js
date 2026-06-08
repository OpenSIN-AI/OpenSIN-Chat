// SPDX-License-Identifier: MIT
import js from "@eslint/js"
import globals from "globals"
import pluginReact from "eslint-plugin-react"
import pluginReactHooks from "eslint-plugin-react-hooks"
import pluginJsxA11y from "eslint-plugin-jsx-a11y"
import pluginPrettier from "eslint-plugin-prettier"
import configPrettier from "eslint-config-prettier"
import unusedImports from "eslint-plugin-unused-imports"
import tseslint from "typescript-eslint"

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

  // TypeScript ESLint recommended rules
  ...tseslint.configs.recommended,

  // Your React/JSX files (both .js/.jsx and .ts/.tsx)
  {
    files: ["src/**/*.{js,jsx,mjs,cjs,ts,tsx}"],
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
      ...pluginReact.configs.flat.recommended.rules,
      ...pluginReactHooks.configs.recommended.rules,
      // Accessibility recommended rules (as warnings, see note above)
      ...a11yRecommendedAsWarnings,
      ...configPrettier.rules,
      "prettier/prettier": "error",

      "react/react-in-jsx-scope": "off",
      "react-hooks/exhaustive-deps": "off",
      "react/prop-types": "off",
      "react-hooks/set-state-in-effect": "off",
      "react/jsx-no-target-blank": "error",
      // Surface new unsanitized dangerouslySetInnerHTML usages (tighten to "error" later)
      "react/no-danger": "warn",
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

      "no-console": ["warn", { "allow": ["warn", "error"] }],
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "unused-imports/no-unused-imports": "error",
      "unused-imports/no-unused-vars": [
        "warn",
        {
          vars: "all",
          varsIgnorePattern: "^_",
          args: "after-used",
          argsIgnorePattern: "^_"
        }
      ],
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/explicit-function-return-types": "off",
      "@typescript-eslint/no-require-imports": "off",

      // Prevent new inline styles after #65 migration
      // Exceptions (Type D runtime values) documented in docs/INLINE-STYLES-AUDIT.md
      "no-restricted-syntax": [
        "error",
        {
          selector: "JSXAttribute[name.name='style'] > JSXExpressionContainer > ObjectExpression",
          message: "Inline styles are prohibited. Use Tailwind utilities instead. See docs/INLINE-STYLES-AUDIT.md for runtime exceptions (Type D)."
        }
      ]
    }
  }
]
