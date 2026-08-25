# Office Paste

Controlled by `features.officePaste`, enhances content pasted from Word / Excel / WPS.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## Support

| Source            | Behavior                                                                                           |
| ----------------- | -------------------------------------------------------------------------------------------------- |
| Word / WPS HTML   | Transform pipeline for lists, bookmarks, MSO style classes, line numbers, image placeholders, etc. |
| Excel             | Table structure transform                                                                          |
| Paste with images | Can trigger `onPasteFromOfficeWithImages` host callback for user prompts                           |

## Usage

No extra setup: copy from an Office app and **Ctrl/Cmd+V** in the editor. When the gate is off, browser default paste is used.

## Configuration

The `OfficePaste` extension itself supports disabling individual HTML transforms (`htmlTransforms`: `lists` / `bookmarks` / `msoStyles` / `msoHtmlClasses` / `lineNumber` / `imagePlaceholder`, all on by default) plus an `excelTablePaste` switch.

However, the registry only passes `onPasteFromOfficeWithImages`, and **`YanivEditor` exposes no prop to forward these options**. Tuning the pipeline requires calling `OfficePaste.configure({ ... })` yourself and taking over extension registration (custom shell / fork). The individual transform functions are exported from `src/extensions/office-paste` to keep them unit-testable.

## Related

- [Table](./table.md)
- [Word Import and Export](./word-import-export.md)
