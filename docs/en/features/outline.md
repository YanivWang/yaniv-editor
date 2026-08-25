# Outline / Table of Contents

Controlled by `features.outline`, built on UniqueID + TableOfContents.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## Usage

The panel depends only on whether `features.outline` is enabled — it is independent of the header.

| preset | Entry                               | Behavior                                                                 |
| ------ | ----------------------------------- | ------------------------------------------------------------------------ |
| full   | Header outline toggle + rail handle | Right/top outline panel; click to jump to headings; collapsed by default |
| notion | Rail handle (no header)             | Same as above                                                            |

When the panel is collapsed, an expand handle (`.outline-rail__handle`) renders at the rail's anchor position. The header's `OutlineToggleButton` is just an extra convenience entry for the full preset — presets that hide the header can still expand from the handle.

Use `:default-outline-expanded="true"` for an initially expanded panel (does not trigger session rebuild).

Outline expanded state (`outlinePanel.expanded`) is user UI state and is **not** part of `chromePolicy`—it is decoupled from preset derivation.

## Preview Mode

The outline container is not rendered under `mode="preview"` (`showOutlineRail=false`).

## Technical Notes

Scroll syncing is handled by `OutlinePanel` itself: `EditorWorkspace` passes `.document-container` down through the `:scroll-parent` prop, the panel listens to its `scroll` event to update the active heading, and uses `scrollToOutlineHeading` for click-to-jump. The heading list itself comes from the `TableOfContents` extension storage.

The extension-side scroll container uses late binding: after `EditorWorkspace` mounts it calls `editor.commands.bindOutlineScrollParent(el)`. That command comes from `createOutlineScrollParentBinder` and writes the container back into `BuildExtensionsCtx.outline` (instance-scoped), where the registry's `TableOfContents.scrollParent` getter reads it; before binding it falls back to `window`.

## Related

- [Contextual UI](./contextual-ui.md)
