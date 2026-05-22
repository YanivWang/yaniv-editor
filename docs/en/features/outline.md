# Outline / Table of Contents

Controlled by `features.outline`, built on UniqueID + TableOfContents.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## Usage

| preset | Entry                  | Behavior                                           |
| ------ | ---------------------- | -------------------------------------------------- |
| full   | Header outline toggle  | Right/top outline panel; click to jump to headings |
| notion | Left workspace outline | No header button; panel expandable by default      |

Outline expanded state (`outlinePanel.expanded`) is user UI state and is **not** part of `chromePolicy`—it is decoupled from preset derivation.

## Preview Mode

The outline container is not rendered under `mode="preview"` (`showOutlineRail=false`).

## Technical Notes

The scroll container is injected via `bindOutlineScrollParent` after `EditorWorkspace` mounts, avoiding DOM-not-ready issues during extension initialization.

## Related

- [Contextual UI](./contextual-ui.md)
