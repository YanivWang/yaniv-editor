# 常见问题（FAQ）

## 集成相关

### 为什么不支持 v-model？

`TiptapProEditor` 基于 Tiptap 命令式 API 设计，内容通过 `@update` 事件或 `getJSON()` / `getHTML()` 读取。这样便于与后端 JSON 存储、差异对比等方案集成。

### 如何保存和加载文档？

编辑器不提供内置 API。典型模式：

```ts
// 保存
@update → debounce → PUT /api/documents/:id { content: json }

// 加载
GET /api/documents/:id → :initial-content="data.content"
```

`documentId` prop 当前**不会**自动触发网络请求。

### initialContent 支持哪些格式？

- HTML 字符串：`'<p>Hello</p>'`
- ProseMirror JSON：`{ type: 'doc', content: [...] }`
- JSON 数组（会自动包装为 doc）

## 功能相关

完整缺口清单见 [功能缺口与半成品](/features/incomplete-features)。

### AI 按钮不可用？

检查：

1. `version="advanced"` 且 `features.ai !== false`
2. `features.headerNav: true`（AI 按钮在工具栏）
3. 已配置 `VITE_AI_API_KEY` 或在 AI 设置面板保存了 Key
4. 网络可访问对应 Provider

### 图片上传后文档很大？

默认本地上传使用 Base64。生产环境请实现 `uploadImage` 回调上传至 OSS，返回 URL。参见 [媒体](/features/media)。

### 如何关闭某个功能？

使用 `features` 门控，例如：

```vue
:features="{ ai: false, table: false, slashCommand: false }"
```

### 斜杠命令不生效？

需同时满足：

```vue
:features="{ slashCommand: true, headerNav: true }"
```

`slashCommand` 会注册扩展并在模板中渲染 `SlashCommandMenu`。

### 协作编辑支持吗？

**当前版本不支持**多人实时协作，代码库未内置相关扩展或配置项。

如需协作，需自行接入 `@tiptap/extension-collaboration` 等 Tiptap 扩展。

### @提及（@mention）支持吗？

`FeatureConfig.mention` 为预留字段，**尚无实现**。

### 有版本历史吗？

无内置版本管理。i18n 中存在相关文案，但编辑器未提供保存版本 UI 或 API。

### 支持 Markdown 吗？

不支持 Markdown 源码编辑模式。Typora 主题是视觉风格，不是 Markdown 双向同步。

### 代码块有语法高亮吗？

已启用 `CodeBlockLowlight`（lowlight + highlight.js）。工具栏 `</>` 下拉可选语言或行内代码；焦点在代码块内时角标也可切换语言；advanced 版本工具栏默认展示代码入口。

## 主题相关

### theme prop 在哪里？

主题不是组件 prop。使用：

```ts
import { setTheme } from "yaniv-editor";
import "yaniv-editor/src/themes/presets/notion.css";

setTheme("notion", "light");
```

### 如何切换暗色模式？

```ts
setTheme("word", "dark");
// 或
toggleThemeMode();
```

容器需有 `data-theme="dark"`（`setTheme` 会自动设置）。

## Full Editor vs Inline

### 应该用哪种？

| 需求                 | 选择                            |
| -------------------- | ------------------------------- |
| 完整文档、CMS 正文   | Full Editor (`TiptapProEditor`) |
| 评论、聊天、轻量表单 | Inline 按需拼装                 |
| 运行时动态工具栏     | Inline Demo 模式                |

详见 [Full Editor](/guide/full-editor) 与 [Inline 拼装](/guide/inline-composition)。

## 开发相关

### 如何本地运行 Demo？

```bash
pnpm install
pnpm dev
```

### 如何本地运行文档？

```bash
pnpm docs:dev
```

### 如何构建文档站点？

```bash
pnpm docs:build
pnpm docs:preview
```

构建产物在 `docs/.vitepress/dist`。

## 还有哪些需要自己做？

| 能力                | 负责方                      |
| ------------------- | --------------------------- |
| 内容持久化          | 业务后端                    |
| 图片/文件 OSS       | 业务后端 + uploadImage 回调 |
| AI 请求代理（安全） | 业务后端（推荐）            |
| 权限 / 审核         | 业务层                      |
| XSS 过滤            | 业务层（渲染 HTML 时）      |
| 多人协作            | 需自行扩展                  |

## 反馈与贡献

- [GitHub Issues](https://github.com/benngaihk/yaniv-editor/issues)
- [GitHub 仓库](https://github.com/benngaihk/yaniv-editor)
