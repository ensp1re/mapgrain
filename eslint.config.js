import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import globals from "globals";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "dist/**",
      "apps/*/dist/**",
      "docs/runs/**",
      "docs/archive/**",
      "packages/cli/studio/**",
      "packages/cli/dist/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["apps/editor/vite.config.ts", "apps/editor/tests/**/*.ts"],
    languageOptions: {
      parserOptions: { projectService: false },
      globals: { ...globals.node, ...globals.browser },
    },
  },
  {
    files: ["apps/**/*.{ts,tsx}"],
    ignores: ["apps/editor/vite.config.ts", "apps/editor/tests/**"],
    plugins: { "react-hooks": reactHooks },
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.browser,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "error",
    },
  },
  {
    files: ["**/*.ts"],
    ignores: ["apps/**"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    files: ["**/*.js"],
    ignores: ["apps/editor/public/**"],
    languageOptions: {
      globals: globals.node,
    },
  },
  {
    files: ["apps/editor/public/**/*.js"],
    languageOptions: {
      globals: globals.serviceworker,
    },
  },
);
