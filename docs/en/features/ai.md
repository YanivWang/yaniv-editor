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

`getAiConfig()` in `client.ts` is the single resolution entry point. It returns at the first level that matches, highest priority first:

1. **Host-managed (instance-scoped)** — the `:ai-config` prop, forwarded through the registry's getters (read fresh on every request)
2. **`getAiRequestConfig()`** — the registered host-managed copy, otherwise the localStorage user config (written by `AiSettingsModal`).
   It validates `enabled` and `apiKey` (except in `proxy` mode) and returns `null` when they don't check out
3. **Host-managed fallback** — when level 2 fails validation but a host config _is_ registered, resolution still uses the
   host's provider / endpoint / model and does **not** fall through to `.env` (so an explicitly host-managed editor never
   silently picks up a build-time key)
4. **Build-time** — `VITE_AI_*` environment variables

Levels 2 and 3 look the host config up without an owner, so both fall through when several editors on the page pass
`:ai-config` (see [AI Config API — Multiple instances](../api/ai-config.md)); requests made by the AI extensions rely on
the instance-scoped getter at level 1 and are unaffected.

Upstream layers (registry getters, `resolveAiExtensionOptions`) **only forward the host's raw values and never fill in defaults**: without `:ai-config`, `resolveAiExtensionOptions` returns `null` and resolution falls through. Defaults (the provider's default endpoint / model, a 60s `timeout`) are filled in inside `getAiConfig()`.

`ai-config` field changes **do not** trigger a session rebuild; changing `model` takes effect on the next request.

`temperature` / `maxTokens` are not part of `ai-config` and do not follow the levels above: their only source is `VITE_AI_TEMPERATURE` / `VITE_AI_MAX_TOKENS` (defaulting to 0.7 / 2048), and they apply whichever level supplied the key and endpoint.

With `storageMode: "proxy"` the key is held by your backend, so an omitted `apiKey` still counts as configured as long as there is a reachable endpoint.

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
