import path from "node:path";
import { fileURLToPath } from "node:url";

import js from "@eslint/js";
import globals from "globals";
import prettier from "eslint-config-prettier/flat";
import importPlugin from "eslint-plugin-import";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

const tsconfigRootDir = path.dirname(fileURLToPath(import.meta.url));

const importPluginSettings = {
  "import/resolver": {
    typescript: {
      alwaysTryTypes: true,
      project: "./tsconfig.eslint.json",
    },
    node: {
      extensions: [".js", ".jsx", ".ts", ".tsx", ".vue", ".mjs", ".cjs"],
    },
  },
};

export default tseslint.config(
  {
    ignores: [
      "dist",
      "**/dist/**",
      "coverage",
      "**/coverage/**",
      "_site",
      "_site/**",
      "dist-demo",
      "dist-demo/**",
      "node_modules",
      "**/node_modules/**",
      "**/*.d.ts",
      "pnpm-lock.yaml",
      ".pnpm-store/**",
      "commitlint.config.cjs",
      "docs/.vitepress/cache/**",
      "docs/.vitepress/dist/**",
      "vitest.config.ts",
    ],
  },
  {
    files: ["src/**/*.{ts,vue,js,mjs}", "examples/**/*.{ts,vue,js,mjs}"],
    plugins: { import: importPlugin },
    settings: importPluginSettings,
    rules: {
      "import/order": [
        "warn",
        {
          groups: [
            "builtin",
            "external",
            "internal",
            "parent",
            "sibling",
            "index",
            "object",
            "type",
          ],
          "newlines-between": "always",
          alphabetize: { order: "asc", caseInsensitive: true },
          pathGroups: [{ pattern: "@/**", group: "internal", position: "before" }],
          pathGroupsExcludedImportTypes: ["builtin"],
        },
      ],
      "import/no-duplicates": "warn",
    },
  },
  ...pluginVue.configs["flat/recommended"],
  {
    files: ["src/**/*.{ts,vue}", "examples/**/*.{ts,vue}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        extraFileExtensions: [".vue"],
        project: "./tsconfig.eslint.json",
        tsconfigRootDir,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-console": ["warn", { allow: ["log", "warn", "error", "info"] }],
      "vue/multi-word-component-names": "off",
      "vue/no-v-html": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "off",
      "@typescript-eslint/no-floating-promises": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-enum-comparison": "off",
      "@typescript-eslint/no-misused-promises": ["error", { checksVoidReturn: false }],
      "@typescript-eslint/prefer-promise-reject-errors": "warn",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        {
          allowNumber: true,
          allowBoolean: true,
          allowNullish: true,
          allowAny: true,
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "vue/require-default-prop": "off",
      "vue/attributes-order": "warn",
      "vue/v-on-event-hyphenation": "off",
      "vue/attribute-hyphenation": "off",
      "@typescript-eslint/ban-ts-comment": "off",
      "@typescript-eslint/no-this-alias": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
  {
    files: ["src/**/*.vue", "examples/**/*.vue"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        project: "./tsconfig.eslint.json",
        tsconfigRootDir,
      },
    },
  },
  {
    files: ["src/**/*.{js,mjs}", "examples/**/*.{js,mjs}"],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  prettier,
);
