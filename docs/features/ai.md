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
| 翻译   | TranslationExtension     | 15 种目标语言   |
| 自定义 | CustomAiExtension        | 用户输入 prompt |

交互 UX：**AiSuggestionPopover** 流式展示建议，可接受/拒绝；**AiHighlightMark** 高亮建议区域。

## 配置来源（优先级）

配置解析的唯一入口是 `client.ts` 的 `getAiConfig()`，命中即返回，优先级从高到低：

1. **宿主托管（实例作用域）** — `:ai-config` prop，经 registry 的 getter 透传（每次请求现取）
2. **`getAiRequestConfig()`** — 已登记的宿主托管副本，否则 localStorage 用户配置（`AiSettingsModal` 写入）。
   该函数会校验 `enabled` 与 `apiKey`（`proxy` 模式除外），不合格返回 `null`
3. **宿主托管兜底** — 第 2 级因校验不过而落空、但确实登记过宿主配置时，仍按宿主声明的
   provider / endpoint / model 走，**不再**下沉到 `.env`（避免宿主明确托管却悄悄用上构建期密钥）
4. **构建时** — `VITE_AI_*` 环境变量

第 2、3 级用的是无 owner 的宿主配置查询，因此同页存在多个传 `:ai-config` 的实例时它们都会落空
（见 [AI 配置 API — 同页多实例](../api/ai-config.md#同页多实例)）；AI 扩展发起的请求靠第 1 级的实例作用域 getter，不受影响。

上游各层（registry getter、`resolveAiExtensionOptions`）**只透传宿主原值、不填兜底**：未传 `:ai-config` 时 `resolveAiExtensionOptions` 返回 `null`，解析继续下沉。缺省值（provider 默认 endpoint / model、`timeout` 60s）统一在 `getAiConfig()` 内补齐。

`ai-config` 字段变化**不触发** session 重建；改 `model` 后下次请求即生效。

`temperature` / `maxTokens` 不在 `ai-config` 里，也不跟随上面的分级：它们只有 `VITE_AI_TEMPERATURE` / `VITE_AI_MAX_TOKENS` 一个来源（缺省 0.7 / 2048），无论最终用哪一级的 key / endpoint 都按这个值发请求。

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

简体中文、繁体中文、英语、日语、泰语、法语、西班牙语、葡萄牙语、韩语、越南语、俄语、德语、印地语、印尼语、阿拉伯语。

## 相关

- [AI 配置 API](../api/ai-config.md)
- [集成 Props](../guide/integration-props.md)
