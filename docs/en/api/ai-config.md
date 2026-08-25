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

Passing `ai-config` marks the editor as host-managed and the lower two levels stop participating. Without it, resolution falls back 2 → 3.

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

## Dynamic Updates

After changing fields like `aiConfig.model`, the **next AI request** uses the new value—no session rebuild needed (extension reads via getters).

## Related

- [AI Assistance](../features/ai.md)
- [Integration Props](../guide/integration-props.md)
