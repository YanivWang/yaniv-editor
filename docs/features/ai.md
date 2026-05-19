# AI 辅助

Yaniv Editor 内置 AI 写作辅助 UI，支持续写、润色、摘要、翻译与自定义指令。

## 前置条件

1. `features.ai !== false`（默认 true）
2. `version="advanced"`（工具栏包含 AI 按钮）
3. 配置 AI API（环境变量或 UI 设置）

## 配置方式

### 方式一：环境变量（开发 / Demo）

复制 `.env.example` 为 `.env`：

```bash
VITE_AI_PROVIDER=openai
VITE_AI_API_KEY=sk-...
# VITE_AI_BASE_URL=
# VITE_AI_MODEL=
```

支持的 `VITE_AI_PROVIDER`：

| Provider   | 说明                        |
| ---------- | --------------------------- |
| `openai`   | OpenAI GPT 系列             |
| `deepseek` | DeepSeek                    |
| `aliyun`   | 通义千问（兼容模式）        |
| `ollama`   | 本地 Ollama（无需 API Key） |
| `custom`   | 自定义 OpenAI 兼容端点      |

### 方式二：编辑器内设置（用户级）

工具栏 AI 按钮 → 设置面板，配置 Provider、API Key、模型等。配置存储在浏览器 localStorage。

```ts
import { useAiConfig } from "@yanivjs/yaniv-editor";

const { config, saveConfig, testConnection } = useAiConfig();
```

## 功能列表

| 功能       | 说明              |
| ---------- | ----------------- |
| 续写       | 从光标处继续写作  |
| 润色       | 优化选中文案      |
| 摘要       | 压缩选区内容      |
| 翻译       | 翻译选中内容      |
| 自定义指令 | 用户自定义 prompt |

AI 结果以建议形式展示，用户确认后写入文档（`AiHighlightMark` 高亮建议区）。

## 关闭 AI

```vue
<YanivEditor :features="{ ai: false }" />
```

## 架构

```text
AiMenuButton (工具栏 / 浮动菜单)
  → editor.commands.polish() 等 Tiptap 命令
PolishExtension / SummarizeExtension / …
  → aiClient (src/features/ai/client.ts)
       → createAiAdapter（OpenAI 兼容流式 API）
  → aiSuggestionManager（建议气泡 + 高亮，续写 / 自定义 AI 除外）
```

## 安全提示

- API Key 不应提交到前端公开仓库
- 生产环境建议通过**后端代理**转发 AI 请求，避免 Key 暴露
- 当前实现支持前端直连（Demo 友好），集成时需评估安全策略

## 相关导出

```ts
import { AiMenuButton, useAiConfig, createAiAdapter, AI_PROVIDERS } from "@yanivjs/yaniv-editor";
```

## 下一步

- [FAQ — AI 不生效](/faq#ai-按钮不可用)
- [功能总览](/features/overview)
