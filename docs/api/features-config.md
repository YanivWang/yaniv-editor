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
resolvedFeatures = {
  ...presetFeatures[preset],
  ...props.features,
};
```

`features` has higher priority than `preset`, so explicit `false` can turn off a capability that the selected preset enables.

```vue
<YanivEditor preset="full" :features="{ ai: false, math: false }" />
```

Turning off an ability removes its extension registration and all matching interaction entry points.

## Preset Defaults

| Preset   | Default abilities                                                                                              | Layout strategy                                        |
| -------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `basic`  | image, video, table                                                                                            | fixed header and footer, no floating menu              |
| `full`   | image, video, table, math, AI, format painter, outline, find/replace, Office paste, slash command, drag handle | fixed header and footer, floating menu                 |
| `notion` | image, video, table, AI, format painter, outline, slash command, drag handle                                   | no fixed header or footer, floating/block interactions |

`preset` owns layout strategy. `features` only overrides abilities, so it cannot re-enable public layout switches such as header, footer, floating menu, or shortcut hints.
