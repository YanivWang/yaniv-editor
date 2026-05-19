---
layout: home

hero:
  name: Yaniv Editor
  text: Vue 3 + Tiptap 3 富文本编辑器
  tagline: 开箱即用的编辑器 UI 套件，支持多主题、可插拔工具栏与 AI 辅助写作
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/getting-started
    - theme: alt
      text: 功能总览
      link: /features/overview
    - theme: alt
      text: GitHub
      link: https://github.com/YanivWang/yaniv-editor

features:
  - title: 完整编辑能力
    details: 标题、列表、表格、图片、视频、链接、代码块、数学公式、Word 导入导出等常见富文本能力。
  - title: 两种集成方式
    details: 使用 YanivEditor 一站式接入，或按需拼装工具栏组件构建轻量 Inline Editor。
  - title: 多主题与 i18n
    details: Word / Notion / GitHub / Typora 视觉预设，支持明暗色与中英繁三语。
  - title: AI 辅助写作
    details: 续写、润色、摘要、翻译与自定义指令，可对接 OpenAI、DeepSeek、通义千问、Ollama 等。
  - title: 可配置功能门控
    details: 通过 features 精确控制扩展注册与工具栏显示，避免 UI 与能力不一致。
  - title: 面向生产集成
    details: 暴露 getJSON / getHTML / getText，内容持久化、图片 OSS 上传由业务层接入。
---

## 适用场景

| 场景                    | 推荐方案                                   |
| ----------------------- | ------------------------------------------ |
| CMS / 博客 / 知识库正文 | `YanivEditor` + `editorPresets.production` |
| 内网文档（单人编辑）    | Full Editor + 自建保存 API                 |
| 评论 / 聊天 / 表单内嵌  | Inline 按需拼装 `@/components/editor` 组件 |
| 多人实时协作文档        | 当前未内置，需基于 Tiptap 协作扩展自行扩展 |

## 在线示例

本地运行演示：

```bash
pnpm install
pnpm dev
```

浏览器访问开发服务器，可体验 **Full Editor** 与 **Inline + Plugins** 两种模式。

## 文档导航

- [快速开始](/guide/getting-started) — 10 分钟完成集成
- [功能总览](/features/overview) — 完整能力清单与预设差异
- [YanivEditor API](/api/yaniv-editor) — Props、Events、Expose
- [FAQ](/faq) — 持久化、图片上传、协作等常见问题
