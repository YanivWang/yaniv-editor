import { defineConfig } from "vitepress";

const isPagesBuild = process.env.VP_BASE != null;
// VitePress prepends `base` automatically; do not include repo prefix here.
const demoUrl = isPagesBuild ? "/examples/" : "http://localhost:9527";
const demoNavItem = isPagesBuild
  ? { text: "Demo", link: demoUrl }
  : { text: "Demo", link: demoUrl, target: "_blank" as const };

const socialLinks = [{ icon: "github", link: "https://github.com/YanivWang/yaniv-editor" }];

const guideSidebar = (prefix: string, en: boolean) => [
  {
    text: en ? "Guide" : "指南",
    items: [
      { text: en ? "Getting Started" : "快速开始", link: `${prefix}/guide/getting-started` },
      { text: "Full Editor", link: `${prefix}/guide/full-editor` },
      {
        text: en ? "Inline Composition" : "Inline 按需拼装",
        link: `${prefix}/guide/inline-composition`,
      },
      { text: en ? "Inline Toolbar" : "Inline 工具栏", link: `${prefix}/guide/inline-toolbar` },
      { text: en ? "Appearance & Color" : "外观与颜色", link: `${prefix}/guide/appearance` },
      { text: en ? "Preview Mode" : "预览模式", link: `${prefix}/guide/preview-mode` },
      { text: en ? "Internationalization" : "国际化", link: `${prefix}/guide/i18n` },
      { text: en ? "Integration Props" : "集成 Props", link: `${prefix}/guide/integration-props` },
      { text: en ? "Z-Index & Overlays" : "Z-Index 与浮层", link: `${prefix}/guide/z-index` },
    ],
  },
];

const featuresSidebar = (prefix: string, en: boolean) => [
  {
    text: en ? "Features" : "功能",
    items: [
      { text: en ? "Overview" : "功能总览", link: `${prefix}/features/overview` },
      { text: en ? "Feature Matrix" : "功能对照表", link: `${prefix}/features/feature-matrix` },
      { text: en ? "Core Editing" : "核心编辑", link: `${prefix}/features/core-editing` },
      { text: en ? "Text Formatting" : "文本与排版", link: `${prefix}/features/text-formatting` },
      { text: en ? "Media" : "媒体", link: `${prefix}/features/media` },
      { text: en ? "Table" : "表格", link: `${prefix}/features/table` },
      { text: en ? "Math" : "数学公式", link: `${prefix}/features/math` },
      { text: en ? "Outline" : "大纲目录", link: `${prefix}/features/outline` },
      { text: en ? "Find & Replace" : "查找替换", link: `${prefix}/features/find-replace` },
      { text: en ? "Format Painter" : "格式刷", link: `${prefix}/features/format-painter` },
      { text: en ? "Office Paste" : "Office 粘贴", link: `${prefix}/features/office-paste` },
      { text: en ? "Block Editing" : "块编辑", link: `${prefix}/features/block-editing` },
      { text: en ? "Contextual UI" : "上下文 UI", link: `${prefix}/features/contextual-ui` },
      {
        text: en ? "Templates & Gallery" : "模板与图库",
        link: `${prefix}/features/templates-gallery`,
      },
      {
        text: en ? "Word Import & Export" : "Word 导入导出",
        link: `${prefix}/features/word-import-export`,
      },
      { text: en ? "AI" : "AI 辅助", link: `${prefix}/features/ai` },
    ],
  },
];

const apiSidebar = (prefix: string, en: boolean) => [
  {
    text: "API",
    items: [
      { text: "YanivEditor", link: `${prefix}/api/yaniv-editor` },
      { text: "YanivInlineEditor", link: `${prefix}/api/yaniv-inline-editor` },
      { text: en ? "FeatureConfig" : "功能配置", link: `${prefix}/api/features-config` },
      { text: en ? "AI Config" : "AI 配置", link: `${prefix}/api/ai-config` },
      { text: "Composables", link: `${prefix}/api/composables` },
    ],
  },
];

const contributingSidebar = (prefix: string, en: boolean) => [
  {
    text: en ? "Contributing" : "贡献",
    items: [
      {
        text: en ? "Project Structure" : "项目结构",
        link: `${prefix}/contributing/project-structure`,
      },
      { text: en ? "Architecture" : "架构设计", link: `${prefix}/contributing/architecture` },
    ],
  },
];

export default defineConfig({
  base: process.env.VP_BASE ?? "/",
  cleanUrls: true,
  lastUpdated: true,
  ignoreDeadLinks: [/^http:\/\/localhost:\d+/],

  locales: {
    root: {
      label: "简体中文",
      lang: "zh-CN",
      title: "Yaniv Editor",
      description: "Vue 3 + Tiptap 3 富文本编辑器组件库",
      themeConfig: {
        logo: "/logo.svg",
        nav: [
          { text: "指南", link: "/guide/getting-started" },
          { text: "功能", link: "/features/overview" },
          { text: "API", link: "/api/yaniv-editor" },
          { text: "FAQ", link: "/faq" },
          { text: "贡献", link: "/contributing/project-structure" },
          demoNavItem,
        ],
        sidebar: {
          "/guide/": guideSidebar("", false),
          "/features/": featuresSidebar("", false),
          "/api/": apiSidebar("", false),
          "/contributing/": contributingSidebar("", false),
        },
        socialLinks,
        search: { provider: "local" },
      },
    },

    en: {
      label: "English",
      lang: "en-US",
      link: "/en/",
      title: "Yaniv Editor",
      description: "Vue 3 + Tiptap 3 rich-text editor component library",
      themeConfig: {
        logo: "/logo.svg",
        nav: [
          { text: "Guide", link: "/en/guide/getting-started" },
          { text: "Features", link: "/en/features/overview" },
          { text: "API", link: "/en/api/yaniv-editor" },
          { text: "FAQ", link: "/en/faq" },
          { text: "Contributing", link: "/en/contributing/project-structure" },
          demoNavItem,
        ],
        sidebar: {
          "/en/guide/": guideSidebar("/en", true),
          "/en/features/": featuresSidebar("/en", true),
          "/en/api/": apiSidebar("/en", true),
          "/en/contributing/": contributingSidebar("/en", true),
        },
        socialLinks,
        search: { provider: "local" },
      },
    },
  },
});
