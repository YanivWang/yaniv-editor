/**
 * Conventional Commits；scope 与仓库目录 yaniv-editor 对齐。
 */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    "scope-enum": [
      2,
      "always",
      [
        "core",
        "examples",
        "extensions",
        "features",
        "tools",
        "ai",
        "locales",
        "styles",
        "appearance",
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
