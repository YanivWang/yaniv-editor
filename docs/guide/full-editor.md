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

`basic` enables image, video, and table for common writing workflows. It keeps a fixed header and footer, but does not enable heavier abilities such as AI, Office paste, math, outline, find/replace, format painter, slash command, or drag handle.

`full` enables the complete capability set and keeps the fixed header, footer, floating menu, contextual tools, and shortcut hints.

`notion` enables a block editing workflow with slash command and drag handle. It hides the fixed top toolbar and footer, relying on floating/block interactions instead.

## Ability Overrides

```vue
<YanivEditor preset="full" :features="{ ai: false }" />
```

The selected preset remains active, but disabled abilities remove their extensions and related UI entry points.

`features` does not control layout chrome. Header, footer, floating menu, and shortcut hints are preset layout decisions.

## Preview

```vue
<YanivEditor mode="preview" preset="basic" :initial-content="html" />
```

Preview shows content without editing chrome. Links, video playback, scrolling, and text selection remain available.
