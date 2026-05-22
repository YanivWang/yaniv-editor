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

## 配置模式对比

| 模式     | 来源         | AI 设置 UI   | 典型场景        |
| -------- | ------------ | ------------ | --------------- |
| 宿主托管 | `:ai-config` | 默认隐藏     | 生产集成        |
| 用户配置 | localStorage | 显示         | Demo / 内部工具 |
| 环境变量 | `VITE_AI_*`  | 视 demo 模式 | 本地开发        |

传入 `ai-config` 后**忽略** localStorage 与 `.env` 中的用户配置。

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
