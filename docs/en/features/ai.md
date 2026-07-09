# AI Assistance

## Toggle

| preset | Default | How to enable                             |
| ------ | ------- | ----------------------------------------- |
| basic  | off     | `:features="{ ai: true }"` + `:ai-config` |
| full   | off     | `:features="{ ai: true }"` + `:ai-config` |
| notion | on      | Pass `:ai-config` (or demo env)           |

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
<YanivEditor preset="notion" :ai-config="aiConfig" />
<YanivEditor preset="notion" :features="{ ai: false }" />
```

When AI is disabled, AI extensions and all AI UI entry points are unavailable.

## Five Actions

After selecting text, trigger via the floating menu; with `full` preset and AI enabled, the header assistant row also shows `AiMenuButton`:

| Action           | Extension                | Description           |
| ---------------- | ------------------------ | --------------------- |
| Continue writing | ContinueWritingExtension | Stream continuation   |
| Polish           | PolishExtension          | Improve selected text |
| Summarize        | SummarizeExtension       | Extract key points    |
| Translate        | TranslationExtension     | 14 target languages   |
| Custom           | CustomAiExtension        | User-provided prompt  |

UX: **AiSuggestionPopover** streams suggestions with accept/reject; **AiHighlightMark** highlights the suggestion region.

## Config Sources (Priority)

1. **Host-managed**: `:ai-config` prop — ignores localStorage / `.env`, hides "AI Settings" by default
2. **User config**: localStorage + `useAiConfig` (when no ai-config)
3. **Build-time**: `VITE_AI_*` env vars (demo mode)

`ai-config` field changes **do not** trigger session rebuild; extensions read dynamically via getters.

## Providers

`openai` | `deepseek` | `aliyun` | `ollama` | `custom` (OpenAI-compatible)

See [AI Config API](../api/ai-config.md).

## AI Subpackage

AI modules are imported from `@yanivjs/yaniv-editor/ai`; the root package does not re-export them:

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

## Translation Languages

Simplified Chinese, Traditional Chinese, English, Japanese, Thai, French, Spanish, Portuguese, Korean, Vietnamese, Russian, German, Hindi, Indonesian.

## Related

- [AI Config API](../api/ai-config.md)
- [Integration Props](../guide/integration-props.md)
