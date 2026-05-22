# Full Editor Guide

Full Editor uses four explicit axes:

- `mode` controls runtime state.
- `preset` controls the feature plan.
- `appearance` controls visual skin.
- `colorMode` controls light, dark, or system color.

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
```

## Presets

`basic` enables image only for common writing workflows. Text formatting and links remain available. It keeps a fixed header and footer, but does not enable video, table, AI, Office paste, math, outline, find/replace, format painter, slash command, or drag handle by default.

`full` enables the advanced document capability set and keeps the fixed header, footer, floating menu, contextual tools, and shortcut hints. AI is not enabled by default.

`notion` enables block editing (slash command, drag handle) plus video, math, outline, find/replace, Office paste, and AI (format painter off). It hides the fixed top toolbar and footer, relying on floating/block interactions instead.

## Ability Overrides

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
<YanivEditor preset="full" :features="{ table: false }" />
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

The selected preset remains active, but disabled abilities remove their extensions and related UI entry points.

`features` does not control layout chrome. Header, footer, floating menu, and shortcut hints are preset layout decisions.

## Preview

```vue
<YanivEditor mode="preview" preset="basic" :initial-content="html" />
```

Preview shows content without editing chrome. Links, video playback, scrolling, and text selection remain available.
