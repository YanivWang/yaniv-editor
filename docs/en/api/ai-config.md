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

## Config Mode Comparison

| Mode         | Source       | AI Settings UI       | Typical use            |
| ------------ | ------------ | -------------------- | ---------------------- |
| Host-managed | `:ai-config` | Hidden by default    | Production integration |
| User config  | localStorage | Shown                | Demo / internal tools  |
| Env vars     | `VITE_AI_*`  | Depends on demo mode | Local development      |

When `ai-config` is provided, user config in localStorage and `.env` is **ignored**.

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
