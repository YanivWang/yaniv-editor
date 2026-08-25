# Find and Replace

Controlled by `features.searchReplace`.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## Usage

Both the panel (`FindReplaceDialog`) and the **Ctrl/Cmd+F shortcut** depend only on `features.searchReplace`. They mount on `EditorEditChrome`, independently of whether the header is shown. The header's `FindReplaceButton` is just an extra click entry — the shortcut still works when that button is not rendered.

| preset | How to open                     |
| ------ | ------------------------------- |
| full   | Header button or **Ctrl/Cmd+F** |
| notion | **Ctrl/Cmd+F** (no header)      |

Features include: case sensitivity, match highlighting, previous/next navigation, replace current, and replace all.

## Preview Transition

Switching to `mode="preview"` unmounts the whole edit chrome (`showEditChrome=false`), which unbinds the panel and the shortcut.

The `SearchReplace` extension **clears its own state** when leaving edit mode (its plugin's `view.update` detects `view.editable` flipping from true to false), so no match-highlight decorations leak into preview. Cleanup is owned by the extension itself and does not rely on the panel's close callback.

## Related

- [Composables API](../api/composables.md) — `useFindReplaceHotkey`
