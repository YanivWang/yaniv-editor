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

## 同页多实例

宿主配置按**实例**登记，互不覆盖：实例 A 传 `ai-config`、实例 B 不传时，B 不会复用 A 的密钥与端点。

`getHostAiConfig()` / `isHostAiManaged()` 接受可选的 `owner`（每个编辑器实例内部持有的 `Symbol`）：

| 调用方式                   | 行为                                     |
| -------------------------- | ---------------------------------------- |
| `getHostAiConfig(owner)`   | 返回该实例的配置，未登记则 `null`        |
| `getHostAiConfig()`        | 仅**一个**实例登记时返回它（单实例场景） |
| `getHostAiConfig()` 多实例 | 返回 `null` 并在控制台告警               |

多实例下无 `owner` 的查询没有正确答案，因此显式失败而不是任选一个——旧版本正是"任选一个"导致跨实例串用密钥。

AI 扩展发起的请求不走这条路径：它们通过实例作用域的 `ctx.aiConfig()` getter 取值，始终正确。

## 相关

- [AI 辅助](../features/ai.md)
- [集成 Props](../guide/integration-props.md)
