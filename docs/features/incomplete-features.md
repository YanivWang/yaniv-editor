# 功能缺口与半成品说明

本文档说明 Yaniv Editor **当前尚未完成**或**仅部分实现**的核心能力，便于集成前评估范围。

::: tip 与「功能总览」的区别
[功能总览](/features/overview) 列出**已实现**的能力矩阵；本文档聚焦**缺口与 Demo 级实现**。
:::

## 一、明确未实现

| 能力              | 现状                                  |
| ----------------- | ------------------------------------- |
| 多人实时协作      | 未内置，无相关 API / 配置             |
| @提及（mention）  | 无扩展与 UI                           |
| 评论 / 批注       | 无                                    |
| 版本历史          | 无组件与 API                          |
| Markdown 双向编辑 | Typora 主题为视觉风格，非 MD 源码模式 |
| 内容持久化        | 由业务层实现，见下方集成模式          |

### 内容持久化（业务层）

编辑器通过 `@update` 输出 JSON，**不会**自动请求后端：

```ts
// 典型集成模式（需自行实现）
@update → debounce → PUT /api/documents/:id
GET /api/documents/:id → :initial-content="data.content"
```

详见 [FAQ — 如何保存和加载文档](/faq#如何保存和加载文档)。

---

## 二、扩展已注册，生产需补齐

### AI 能力

| 项             | 说明                                                   |
| -------------- | ------------------------------------------------------ |
| 未配置 API Key | 可设 `VITE_AI_DEMO_MODE=true` 走本地模拟流，非真实模型 |
| API Key 存储   | localStorage + 简单混淆，非加密；生产建议后端代理      |

配置方式见 [AI 辅助](/features/ai)。

### 图库（Gallery）

`GalleryButton` 可扫描**当前文档**图片或接收外部列表，**不是**独立素材库（上传、分类、权限需业务自建）。

### 媒体上传（图片 / 视频）

| 情况                               | 行为                                   |
| ---------------------------------- | -------------------------------------- |
| 提供 `uploadImage` / `uploadVideo` | 使用返回 URL 插入                      |
| 未提供回调                         | **Base64 Data URL** 嵌入，文档体积膨胀 |

### Word 导入导出

基于 `mammoth` / `docx`，复杂排版可能丢失。详见 [Word 导入导出](/features/word-import-export)。

### Office 粘贴含图

含图粘贴常被替换为占位符，可通过 `officePaste.onPasteFromOfficeWithImages` 自定义提示。

---

## 三、默认关闭的体验模块

以下能力已实现，开箱需通过 `features` 或 `editorPresets.production` 开启：

- `headerNav`、`footerNav`
- `slashCommand`、`floatingMenu`、`linkBubbleMenu`
- `tableToolbar`

---

## 四、已实现较完整的核心

在 `editorPresets.production` 或等价 `features` 下，通常可直接使用：

- 文本排版、表格、代码块、数学公式、查找替换、格式刷
- 链接、图片缩放、视频、块拖拽、大纲侧栏
- AI 续写 / 润色 / 摘要 / 翻译 / 自定义指令（配置 API 后）
- 模板插入、Word 模式分页视图

完整列表见 [功能总览](/features/overview)。

---

## 相关文档

- [功能总览](/features/overview)
- [功能配置](/api/features-config)
- [常见问题](/faq)
