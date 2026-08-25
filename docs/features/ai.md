# AI 辅助

## 开关

| preset | 默认 | 启用方式                                  |
| ------ | ---- | ----------------------------------------- |
| basic  | 关   | `:features="{ ai: true }"` + `:ai-config` |
| full   | 关   | `:features="{ ai: true }"` + `:ai-config` |
| notion | 开   | 传入 `:ai-config`（或 demo 环境）         |

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
<YanivEditor preset="notion" :ai-config="aiConfig" />
<YanivEditor preset="notion" :features="{ ai: false }" />
```

关闭 AI 后，AI 扩展与所有 AI UI 入口不可用。

## 五种动作

选中文字后，通过浮动菜单触发；`full` preset 在开启 AI 时顶栏「智能」区也有 `AiMenuButton`：

| 动作   | 扩展                     | 说明            |
| ------ | ------------------------ | --------------- |
| 续写   | ContinueWritingExtension | 流式续写下文    |
| 润色   | PolishExtension          | 优化选中文本    |
| 总结   | SummarizeExtension       | 提取要点        |
| 翻译   | TranslationExtension     | 14 种目标语言   |
| 自定义 | CustomAiExtension        | 用户输入 prompt |

交互 UX：**AiSuggestionPopover** 流式展示建议，可接受/拒绝；**AiHighlightMark** 高亮建议区域。

## 配置来源（优先级）

配置解析的唯一入口是 `client.ts` 的 `getAiConfig()`，优先级从高到低：

1. **宿主托管** — `:ai-config` prop，经 registry 的 getter 透传（每次请求现取）
2. **用户配置** — localStorage（`AiSettingsModal` 写入，`getAiRequestConfig()` 读取）
3. **构建时** — `VITE_AI_*` 环境变量

上游各层（registry getter、`resolveAiExtensionOptions`）**只透传宿主原值、不填兜底**：未传 `:ai-config` 时 `resolveAiExtensionOptions` 返回 `null`，解析继续下沉到第 2、3 级。缺省值（provider 默认 endpoint / model、`timeout` 60s）统一在 `getAiConfig()` 内补齐。

`ai-config` 字段变化**不触发** session 重建；改 `model` 后下次请求即生效。

`storageMode: "proxy"` 时密钥由后端保管，前端不传 `apiKey` 也会被判定为「已配置」（只要有可达 endpoint）。

## 提供商

`openai` | `deepseek` | `aliyun` | `ollama` | `custom`（OpenAI 兼容）

详见 [AI 配置 API](../api/ai-config.md)。

## AI 子包

AI 模块从 `@yanivjs/yaniv-editor/ai` 导入，根包不 re-export：

```ts
import {
  ContinueWritingExtension,
  PolishExtension,
  SummarizeExtension,
  TranslationExtension,
  CustomAiExtension,
  AiMenuButton,
  AiSettingsModal,
  useAiConfig,
  createAiClient,
  AI_PROVIDERS,
} from "@yanivjs/yaniv-editor/ai";
```

## 翻译语言

简体中文、繁体中文、英语、日语、泰语、法语、西班牙语、葡萄牙语、韩语、越南语、俄语、德语、印地语、印尼语。

## 相关

- [AI 配置 API](../api/ai-config.md)
- [集成 Props](../guide/integration-props.md)
