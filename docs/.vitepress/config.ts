import { defineConfig } from "vitepress";

export default defineConfig({
  title: "Yaniv Editor",
  description: "Vue 3 + Tiptap 3 富文本编辑器 UI 套件",
  lang: "zh-CN",
  cleanUrls: true,
  lastUpdated: true,
  themeConfig: {
    logo: "/logo.svg",
    nav: [
      { text: "指南", link: "/guide/getting-started" },
      { text: "功能", link: "/features/overview" },
      { text: "API", link: "/api/yaniv-editor" },
      { text: "FAQ", link: "/faq" },
      {
        text: "示例",
        link: "https://github.com/YanivWang/yaniv-editor",
        target: "_blank",
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "指南",
          items: [
            { text: "快速开始", link: "/guide/getting-started" },
            { text: "Full Editor", link: "/guide/full-editor" },
            { text: "Inline 按需拼装", link: "/guide/inline-composition" },
            { text: "主题与样式", link: "/guide/theming" },
          ],
        },
      ],
      "/features/": [
        {
          text: "功能",
          items: [
            { text: "功能总览", link: "/features/overview" },
            { text: "功能缺口与半成品", link: "/features/incomplete-features" },
            { text: "文本与排版", link: "/features/text-formatting" },
            { text: "媒体", link: "/features/media" },
            { text: "表格", link: "/features/table" },
            { text: "AI 辅助", link: "/features/ai" },
            { text: "Word 导入导出", link: "/features/word-import-export" },
          ],
        },
      ],
      "/api/": [
        {
          text: "API",
          items: [
            { text: "YanivEditor", link: "/api/yaniv-editor" },
            { text: "功能配置", link: "/api/features-config" },
            { text: "Composables", link: "/api/composables" },
          ],
        },
      ],
    },
    socialLinks: [{ icon: "github", link: "https://github.com/YanivWang/yaniv-editor" }],
    footer: {
      message: "MIT Licensed",
      copyright: "Copyright © Yaniv Editor contributors",
    },
    search: {
      provider: "local",
    },
  },
});
