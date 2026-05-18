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
      "node_modules",
      "**/node_modules/**",
      "**/*.d.ts",
      "pnpm-lock.yaml",
      ".pnpm-store/**",
      "commitlint.config.cjs",
    ],
  },
  {
    files: ["src/**/*.{ts,vue,js,mjs}", "demo/**/*.{ts,vue,js,mjs}"],
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
    files: ["src/**/*.{ts,vue}", "demo/**/*.{ts,vue}"],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.eslint.json",
        tsconfigRootDir,
      },
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "no-console": ["warn", { allow: ["log", "warn", "error", "info"] }],
      "vue/multi-word-component-names": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-floating-promises": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-base-to-string": "warn",
      "@typescript-eslint/require-await": "off",
      "@typescript-eslint/no-unnecessary-type-assertion": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-enum-comparison": "warn",
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
      // 首次接入：存量代码量大，先降级为 warn；后续可逐步提高为 error。
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",
      "vue/require-default-prop": "off",
      "vue/attributes-order": "warn",
      "vue/v-on-event-hyphenation": "off",
      "vue/attribute-hyphenation": "off",
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "@typescript-eslint/no-unused-expressions": "warn",
      "@typescript-eslint/no-empty-object-type": "warn",
    },
  },
  {
    files: ["src/**/*.vue", "demo/**/*.vue"],
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
    files: ["src/**/*.{js,mjs}", "demo/**/*.{js,mjs}"],
    extends: [js.configs.recommended, tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  /**
   * Tiptap / ProseMirror：`editor.chain()`、NodeView、attrs 等在类型上大量落在 any；
   * 全量改成严格类型成本极高。以下目录关闭 no-unsafe-* / no-explicit-any，
   * 仍保留 misused-promises、restrict-template-expressions 等规则（继承上文）。
   */
  {
    files: [
      "src/tools/**/*.{ts,vue}",
      "src/ai/**/*.{ts,vue}",
      "src/features/**/*.{ts,vue}",
      "src/configs/**/*.{ts,vue}",
      "src/extensions/**/*.{ts,vue}",
      "src/api/**/*.{ts,vue}",
      "demo/**/*.{ts,vue}",
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
    },
  },
  prettier,
);
