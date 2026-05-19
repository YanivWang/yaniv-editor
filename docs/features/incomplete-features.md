# 功能缺口与半成品说明

本文档说明 Yaniv Editor **当前尚未完成**或**仅部分实现**的核心能力，便于集成前评估范围、避免误以为已内置完整产品能力。

::: tip 与「功能总览」的区别
[功能总览](/features/overview) 列出**已实现**的能力矩阵；本文档聚焦**缺口、预留与 Demo 级实现**。
:::

## 一、明确未实现（仅预留，无代码）

以下能力在类型、文案或环境变量中有痕迹，但**没有**对应的 Tiptap 扩展或 UI。

| 能力                | 现状                                              | 相关位置                  |
| ------------------- | ------------------------------------------------- | ------------------------- |
| 多人实时协作        | 未内置，无相关 API / 配置                         | `docs/faq.md`             |
| @提及（mention）    | `FeatureConfig.mention` 为预留字段，无扩展实现    | `src/core/editorTypes.ts` |
| 评论 / 批注         | 无                                                | —                         |
| 版本历史 / 自动保存 | i18n 有 `versionHistory.*` 文案，**无组件与 API** | `src/locales/*.ts`        |
| Markdown 双向编辑   | Typora 主题为视觉风格，非 MD 源码模式             | `docs/faq.md`             |
| 内容持久化          | 由业务层实现；`documentId` 不会触发加载/保存      | `YanivEditor` props       |

### documentId

`documentId` 已声明供业务层「加载、保存」标识文档，但**当前版本不会自动发起网络请求**：

```ts
// 典型集成模式（需自行实现）
@update → debounce → PUT /api/documents/:id
GET /api/documents/:id → :initial-content="data.content"
```

详见 [FAQ — 如何保存和加载文档](/faq#如何保存和加载文档)。

---

## 二、扩展已注册，产品层未完成

### 大纲 / 目录（outline）

`advanced` 默认注册：

- `UniqueID` — 为标题生成唯一 ID
- `TableOfContents` — 产出目录数据结构

**未提供**侧边栏大纲 UI。扩展数据可供业务自行渲染目录面板；关闭方式：`features.outline: false`。

详见 [文本与排版 — 大纲与锚点](/features/text-formatting#大纲与锚点)。

### AI 能力（UI 完整，生产需补齐）

| 项                                | 说明                                                                                                |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| 未配置 API Key                    | 走 `simulateAiStream` 本地模拟流式输出，非真实模型（`src/api/ai.ts`）                               |
| Anthropic 提供商                  | 设置面板可选，工厂复用 OpenAI 兼容适配器；原生 Claude API 格式不同，通常需代理端点                  |
| API Key 存储                      | localStorage + 简单混淆，非加密；生产建议后端代理                                                   |
| 翻译语言（ToolbarDropdownButton） | 下拉含翻译子菜单，但 `setTranslateLang` 为 stub，未接入 `translateStore`；`AiMenuButton` 路径已接好 |

配置方式见 [AI 辅助](/features/ai)。

### 图库（Gallery）

`GalleryButton` 可：

- 扫描**当前文档**已有图片并复用插入
- 通过 `images` prop 传入外部列表

**不是**独立素材库（上传、分类、权限、CDN 管理等需业务自建）。文档说明其主要用于 Demo 快速插图。

### 媒体上传（图片 / 视频）

| 情况                               | 行为                                   |
| ---------------------------------- | -------------------------------------- |
| 提供 `uploadImage` / `uploadVideo` | 使用返回 URL 插入                      |
| 未提供回调                         | **Base64 Data URL** 嵌入，文档体积膨胀 |

生产环境务必实现上传回调，参见 [媒体](/features/media)。

### Word 导入导出

基于 `mammoth`（导入）与 `docx`（导出），基本结构可用。限制包括：

- 复杂排版（分栏、文本框、艺术字等）可能丢失
- 图片需可访问 URL 或 Base64
- 与 Office 粘贴增强互补：粘贴适合片段，导入适合整篇

详见 [Word 导入导出](/features/word-import-export)。

### Office 粘贴含图

从 Word 粘贴含图内容时，图片常被替换为占位符，需用户通过「插入图片」或上传单独处理。可通过 `officePaste.onPasteFromOfficeWithImages` 自定义提示行为。

---

## 三、版本与配置层面的缺口

### 默认关闭的体验模块

以下能力已实现，但需显式开启，开箱并非「全功能套件」：

- `headerNav`、`footerNav`
- `slashCommand`、`floatingMenu`、`linkBubbleMenu`
- `tableToolbar`

推荐生产配置见 [功能配置 — 推荐生产配置](/api/features-config#推荐生产配置)。

---

## 四、已实现较完整的核心（对比参考）

在 `version="advanced"` 且正确配置 `features` 时，以下能力通常可直接使用：

- 文本排版：标题、列表、对齐、颜色、行距、上下标等
- 表格、代码块语法高亮、数学公式（KaTeX）
- 查找替换、格式刷、撤销重做
- 链接、图片缩放、视频插入、块拖拽
- AI 续写 / 润色 / 摘要 / 翻译 / 自定义指令（**配置 API 后**）
- 模板插入、Word 模式分页视图（CSS 估算页数）

完整列表见 [功能总览](/features/overview)。

---

## 五、按场景的快速判断

| 场景                     | 是否满足 | 备注                                 |
| ------------------------ | -------- | ------------------------------------ |
| CMS / 博客 / 知识库      | ✅       | 需自建保存与图片上传                 |
| 内网单人文档             | ✅       | 需自建保存                           |
| 评论 / 聊天              | ⚠️       | 建议 Inline 模式按需拼装             |
| Google Docs 式协作       | ❌       | 需自行扩展                           |
| Markdown 优先工作流      | ❌       | 不支持 MD 源码编辑                   |
| 开箱即用完整 Notion 体验 | ⚠️       | 缺大纲 UI、协作、mention、版本历史等 |

---

## 六、集成建议优先级

若目标是**上线 CMS / 内网文档**，通常优先补齐：

1. **内容持久化** — `@update` + 后端 API
2. **媒体上传** — `uploadImage` / `uploadVideo` 接 OSS
3. **AI 后端代理** — 避免 API Key 暴露在前端

若对标 **Notion / Google Docs**，还需规划：

- 大纲侧栏 UI（基于现有 `TableOfContents` 数据）
- mention（@提及）
- 版本历史（当前仅有 i18n，需从零实现）

---

## 相关文档

- [功能总览](/features/overview)
- [功能配置](/api/features-config)
- [常见问题](/faq)
