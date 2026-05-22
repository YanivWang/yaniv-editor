# Find and Replace

Controlled by `features.searchReplace`.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## Usage

| preset | How to open                       |
| ------ | --------------------------------- |
| full   | Header button or **Ctrl/Cmd+F**   |
| notion | **Ctrl/Cmd+F** (no header button) |

Features include: case sensitivity, match highlighting, previous/next navigation, and replace all.

## Preview Transition

When switching to `mode="preview"`, find state is cleared (`clearSearch` runs after the phase transition emit).

## Related

- [Composables API](../api/composables.md) — `useFindReplaceHotkey`
