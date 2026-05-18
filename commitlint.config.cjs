/**
 * Conventional Commits；scope 与 Tiptap-UI-Kit 目录对齐。
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "core",
        "demo",
        "extensions",
        "features",
        "tools",
        "ai",
        "locales",
        "styles",
        "themes",
        "ui",
        "tests",
        "repo",
        "deps",
      ],
    ],
    "subject-max-length": [2, "always", 100],
    "body-max-line-length": [2, "always", 100],
  },
};
