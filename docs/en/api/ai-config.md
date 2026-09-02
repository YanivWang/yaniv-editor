# AI Config

## YanivEditorAiConfig

Injected via the `ai-config` prop on `YanivEditor` (host-managed mode):

```ts
interface YanivEditorAiConfig {
  provider: "openai" | "deepseek" | "aliyun" | "ollama" | "custom";
  apiKey?: string;
  endpoint?: string;
  model?: string;
  timeout?: number;
  enabled?: boolean;
  /** @default 'memory' */
  storageMode?: "local" | "memory" | "proxy";
  /** Defaults to false when ai-config is provided */
  showSettings?: boolean;
}
```

## Example

```vue
<script setup lang="ts">
import type { YanivEditorAiConfig } from "@yanivjs/yaniv-editor";

const aiConfig: YanivEditorAiConfig = {
  provider: "deepseek",
  apiKey: import.meta.env.VITE_DEEPSEEK_KEY,
  model: "deepseek-chat",
  storageMode: "memory",
  showSettings: false,
};
</script>

<template>
  <YanivEditor preset="notion" :ai-config="aiConfig" />
</template>
```

## Field Defaults

Only `provider` is required on `ai-config`; the remaining fields fall back as follows (see `capabilities/registry.ts` and `features/ai/shared/extensionOptions.ts`):

| Field          | When omitted                                       |
| -------------- | -------------------------------------------------- |
| `apiKey`       | `""`                                               |
| `endpoint`     | the provider's `defaultEndpoint` in `AI_PROVIDERS` |
| `model`        | the provider's `defaultModel` in `AI_PROVIDERS`    |
| `timeout`      | `30000` (the registry's `getTimeout` fallback)     |
| `enabled`      | `true` (`enabled !== false`)                       |
| `storageMode`  | `"memory"`                                         |
| `showSettings` | `false` when `ai-config` is present, else `true`   |

## Config Mode Comparison

| Mode         | Source       | AI Settings UI    | Priority | Typical use            |
| ------------ | ------------ | ----------------- | :------: | ---------------------- |
| Host-managed | `:ai-config` | Hidden by default |    1     | Production integration |
| User config  | localStorage | Shown             |    2     | Demo / internal tools  |
| Env vars     | `VITE_AI_*`  | Shown             |    3     | Local development      |

The table lists the three **configuration sources**; resolution inside `getAiConfig()` actually has four levels (host-managed occupies levels 1 and 3, where level 3 is the fallback used when the host config fails validation, so resolution never silently drops to `.env`). See [AI Assistance — Config sources](../features/ai.md) for the full order.

Passing `ai-config` marks the editor as host-managed and the env-var level stops participating. Without it, resolution falls back 2 → 3.

## Subpackage API

```ts
import {
  setHostAiConfig,
  getHostAiConfig,
  useAiConfig,
  createAiClient,
  AI_PROVIDERS,
} from "@yanivjs/yaniv-editor/ai";
```

`AI_PROVIDERS` carries **technical parameters only** (`id` / `defaultEndpoint` / `defaultModel` /
`requiresApiKey` / `docsUrl`). Display names and descriptions are UI copy and live in the locale packs
under `aiSettings.providerName[id]` / `aiSettings.providerDesc[id]`, so they follow `locale`.

`ConnectionTestResult` from `useAiConfig().testConnection()` likewise returns **keys, not copy**:

```ts
interface ConnectionTestResult {
  success: boolean;
  /** Locale key, e.g. `aiSettings.testTimeout` */
  messageKey: string;
  /** Raw provider error text (not localizable); shown in preference to `messageKey` */
  detail?: string;
  latency?: number;
}
```

`createAiClient({ getLocaleText })` accepts the per-instance locale resolver too — the AI extensions
inject it via `createConfiguredAiClient`; the exported `aiClient` singleton has none, so its own
messages fall back to English.

## Dynamic Updates

After changing fields like `aiConfig.model`, the **next AI request** uses the new value—no session rebuild needed (extension reads via getters).

## Multiple Instances On One Page

Host configs are registered **per instance** and never overwrite each other: if instance A passes `ai-config` and instance B does not, B will not silently reuse A's key and endpoint.

`getHostAiConfig()` / `isHostAiManaged()` take an optional `owner` (a `Symbol` each editor instance holds internally):

| Call                          | Behavior                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------- |
| `getHostAiConfig(owner)`      | Returns that instance's config, or `null` if not registered                                 |
| `getHostAiConfig()`           | Returns the config only when exactly **one** instance registered (the single-instance case) |
| `getHostAiConfig()` with many | Returns `null` and logs a console warning                                                   |

With several instances there is no correct answer for an owner-less lookup, so it fails explicitly instead of picking one — "picking one" is exactly what used to leak keys across instances.

Requests made by the AI extensions do not go through this path: they read the instance-scoped `ctx.aiConfig()` getter and are always correct.

## Related

- [AI Assistance](../features/ai.md)
- [Integration Props](../guide/integration-props.md)
