# AI 配置

## YanivEditorAiConfig

通过 `YanivEditor` 的 `ai-config` prop 注入（宿主托管模式）：

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
  /** 有 ai-config 时默认 false */
  showSettings?: boolean;
}
```

## 示例

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

## 字段默认值

`ai-config` 只有 `provider` 必填，其余字段的兜底顺序如下（见 `capabilities/registry.ts` 与 `features/ai/shared/extensionOptions.ts`）：

| 字段           | 未传时                                            |
| -------------- | ------------------------------------------------- |
| `apiKey`       | `""`                                              |
| `endpoint`     | `AI_PROVIDERS` 中该 provider 的 `defaultEndpoint` |
| `model`        | `AI_PROVIDERS` 中该 provider 的 `defaultModel`    |
| `timeout`      | `60000`（`getAiConfig()` 的 `DEFAULT_TIMEOUT`）   |
| `enabled`      | `true`（`enabled !== false`）                     |
| `storageMode`  | `"memory"`                                        |
| `showSettings` | 有 `ai-config` 时 `false`，否则 `true`            |

## 配置模式对比

| 模式     | 来源         | AI 设置 UI | 优先级 | 典型场景        |
| -------- | ------------ | ---------- | :----: | --------------- |
| 宿主托管 | `:ai-config` | 默认隐藏   |   1    | 生产集成        |
| 用户配置 | localStorage | 显示       |   2    | Demo / 内部工具 |
| 环境变量 | `VITE_AI_*`  | 显示       |   3    | 本地开发        |

传入 `ai-config` 后即视为宿主托管，后两级不再参与解析。未传时按 2 → 3 依次回退。

## 子包 API

```ts
import {
  setHostAiConfig,
  getHostAiConfig,
  useAiConfig,
  createAiClient,
  AI_PROVIDERS,
} from "@yanivjs/yaniv-editor/ai";
```

## 动态更新

修改 `aiConfig.model` 等字段后，**下次 AI 请求**使用新值，无需重建 session（扩展内 getter 读取）。

## 相关

- [AI 辅助](../features/ai.md)
- [集成 Props](../guide/integration-props.md)
