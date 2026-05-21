# Composables

Public composables are exported from the root package for advanced integration.

## Editor Context

```ts
import { provideYanivEditor, useYanivEditor } from "@yanivjs/yaniv-editor";
```

Use these when custom tool components need access to the active editor instance.

## Visual Context

```ts
import {
  registerAppearance,
  resolveColorMode,
  useResolvedColorMode,
  watchSystemColorMode,
  editorAppearanceInjectionKey,
  useInjectEditorAppearance,
} from "@yanivjs/yaniv-editor";
```

`YanivEditor` drives visual state with `appearance` and `colorMode`.
