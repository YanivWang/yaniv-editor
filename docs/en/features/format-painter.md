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

Switching to preview unmounts the header, so the format painter button disappears.

The `FormatPainter` extension **runs `cancelFormatPainting` itself** when leaving edit mode (its plugin's `view.update` detects `view.editable` flipping from true to false), clearing the active flag, the sampled formats, and the painter cursor style on the editor surface. The state belongs to the extension, so the reset does too — it does not depend on the button component's unmount path.

It is also an `interaction` tier capability, so `buildExtensions` wraps it in `withTransactionGuard` and every doc-changing transaction is rejected by `filterTransaction` under preview — a second layer of safety.

## Related

- [Text Formatting](./text-formatting.md)
