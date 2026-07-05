# Outline / Table of Contents

Controlled by `features.outline`, built on UniqueID + TableOfContents.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## Usage

| preset | Entry                  | Behavior                                                                 |
| ------ | ---------------------- | ------------------------------------------------------------------------ |
| full   | Header outline toggle  | Right/top outline panel; click to jump to headings; collapsed by default |
| notion | Left workspace outline | No header button; left rail collapsed by default                         |

Use `:default-outline-expanded="true"` for an initially expanded panel (does not trigger session rebuild).

Outline expanded state (`outlinePanel.expanded`) is user UI state and is **not** part of `chromePolicy`—it is decoupled from preset derivation.

## Preview Mode

The outline container is not rendered under `mode="preview"` (`showOutlineRail=false`).

## Technical Notes

The scroll container is injected via `bindOutlineScrollParent` after `EditorWorkspace` mounts, avoiding DOM-not-ready issues during extension initialization.

## Related

- [Contextual UI](./contextual-ui.md)
