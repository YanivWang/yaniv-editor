# FeatureConfig

`FeatureConfig` is an ability override layer for `YanivEditor`.

```ts
interface FeatureConfig {
  image?: boolean;
  video?: boolean;
  table?: boolean;
  math?: boolean;
  ai?: boolean;
  formatPainter?: boolean;
  outline?: boolean;
  searchReplace?: boolean;
  officePaste?: boolean;
  slashCommand?: boolean;
  dragHandle?: boolean;
}
```

## Resolution

Full Editor resolves abilities with one fixed rule:

```ts
import { resolveEditorProfile } from "@yanivjs/yaniv-editor";

const { features: resolvedFeatures } = resolveEditorProfile({
  preset,
  features: props.features,
});
```

Internally this uses `mergeFeatures`. Only explicitly set keys override the preset; `undefined` does not replace a preset default. Explicit `false` can turn off a capability that the selected preset enables.

```vue
<YanivEditor preset="full" :features="{ ai: false, math: false }" />
```

Turning off an ability removes its extension registration and all matching interaction entry points.

## Preset Defaults

Preset default abilities come from `resolveEditorProfile`. Toolbar buttons are filtered again by active gates.

| Preset   | Default abilities                                                                                                   | Layout strategy                                        |
| -------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `basic`  | image                                                                                                               | fixed header and footer, no floating menu              |
| `full`   | image, video, table, math, format painter, outline, find/replace, Office paste                                      | fixed header and footer, floating menu                 |
| `notion` | image, video, table, math, AI, outline, find/replace, Office paste, slash command, drag handle (not format painter) | no fixed header or footer, floating/block interactions |

`full` and `basic` disable AI by default. Enable it explicitly:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

`notion` enables AI by default; still pass `:ai-config` (or env demo mode) for a working provider.

`basic` no longer enables table or video by default. Restore the old behavior with:

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

`preset` owns layout strategy. `features` only overrides abilities, so it cannot re-enable public layout switches such as header, footer, floating menu, or shortcut hints.
