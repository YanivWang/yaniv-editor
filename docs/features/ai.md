# AI

`basic` and `full` disable AI by default. Enable it with `features.ai` and provide host-owned config through `ai-config`:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
<YanivEditor preset="full" :features="{ ai: false }" />
```

`notion` enables the AI capability by default (extensions and floating AI entry points register automatically). You still need `:ai-config` (or demo env) to call a provider:

```vue
<YanivEditor preset="notion" :ai-config="aiConfig" />
<YanivEditor preset="notion" :features="{ ai: false }" />
```

When AI is disabled, AI extensions and AI UI entry points are unavailable.

## AI Subpackage

AI extensions and UI are exported from `@yanivjs/yaniv-editor/ai`:

```ts
import {
  ContinueWritingExtension,
  PolishExtension,
  SummarizeExtension,
  TranslationExtension,
  AiMenuButton,
  useAiConfig,
} from "@yanivjs/yaniv-editor/ai";
```

The root package does not re-export AI modules.
