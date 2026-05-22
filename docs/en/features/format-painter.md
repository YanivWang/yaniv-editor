# Format Painter

Controlled by `features.formatPainter`.

## Enable

```vue
<YanivEditor preset="full" />
```

The `notion` preset **disables** format painter by default (aligned with Notion product behavior).

## Usage

1. Select formatted text as the source
2. Click the format painter in the header
3. Apply to the target selection

Supports single-use and continuous modes (extension internal commands). Can copy font, color, line height, and other mark attributes.

## Preview Transition

Switching to preview runs `cancelFormatPainting` to clear format painter state.

## Related

- [Text Formatting](./text-formatting.md)
