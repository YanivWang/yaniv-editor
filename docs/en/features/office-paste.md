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

The extension supports disabling individual HTML transforms (`htmlTransforms` config, for advanced integration scenarios).

## Related

- [Table](./table.md)
- [Word Import and Export](./word-import-export.md)
