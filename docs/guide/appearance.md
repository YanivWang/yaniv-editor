# Appearance And Color

Visual configuration is split into two props:

- `appearance`: `default | word | notion | github | typora | custom`.
- `colorMode`: `light | dark | auto`.

```vue
<YanivEditor appearance="notion" color-mode="auto" />
```

`appearance="notion"` is only visual. `preset="notion"` controls the block editing feature plan. They can be used independently or together:

```vue
<YanivEditor preset="basic" appearance="notion" />
<YanivEditor preset="notion" appearance="default" />
<YanivEditor preset="notion" appearance="notion" />
```

## Custom Appearance

Use `appearance="custom"` with `customAppearanceVars` on the editor instance:

```vue
<YanivEditor
  appearance="custom"
  :custom-appearance-vars="{
    '--ye-primary': '#6366f1',
    '--ye-bg': '#f8fafc',
  }"
/>
```

## Utilities

```ts
import {
  loadAppearance,
  preloadAppearances,
  applyCustomAppearanceToElement,
  resolveColorMode,
  useResolvedColorMode,
  watchSystemColorMode,
} from "@yanivjs/yaniv-editor";
```

All built-in appearance CSS is provided by `@yanivjs/yaniv-editor/style.css`. `loadAppearance` and `preloadAppearances` keep the public API asynchronous but only mark built-in appearances as ready.
