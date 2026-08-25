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

`full` enables table, video, math, Office paste, outline, find/replace, and format painter. It keeps the fixed header, footer, floating menu, contextual tools, and shortcut hints. Slash command, drag handle, and AI are not enabled by default.

`notion` enables block editing (slash command, drag handle) plus image, video, table, math, outline, find/replace, Office paste, and AI (format painter off). It hides the fixed top toolbar and footer, relying on floating/block interactions instead.

Note: with the header hidden, the outline toggle and the find/replace button (both header-only) are unreachable, so those two capabilities register their extensions but have no UI entry point under `notion`. See [Outline](../features/outline.md) and [Find and Replace](../features/find-replace.md).

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
