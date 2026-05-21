# AI

AI is disabled in all presets by default. Enable it with `features.ai` and provide host-owned config through `ai-config`.

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
<YanivEditor preset="full" :features="{ ai: false }" />
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
