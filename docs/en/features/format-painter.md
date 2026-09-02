# Format Painter

Controlled by `features.formatPainter`.

## Enable

```vue
<YanivEditor preset="full" />
```

The `notion` preset **disables** format painter by default (aligned with Notion product behavior).

## Usage

1. Select formatted text as the source
2. **Click** the format painter in the header (single-use) or **double-click** it (continuous)
3. Select the target text in the document — releasing the mouse applies the format

Step 3 needs no second button press: on `mouseup` the extension applies the format itself if it is still
active and the selection is non-empty. Single-use mode exits after one application; continuous mode stays
on until you press **Esc** or click the button again.

What gets sampled: bold / italic / underline / strike / superscript / subscript, the color, font family and
font size on `textStyle`, the `highlight` background color, plus the alignment and line height of the
paragraph or heading.

## Preview Transition

Switching to preview unmounts the header, so the format painter button disappears.

The `FormatPainter` extension **runs `cancelFormatPainting` itself** when leaving edit mode (its plugin's `view.update` detects `view.editable` flipping from true to false), clearing the active flag, the sampled formats, and the painter cursor style on the editor surface. The state belongs to the extension, so the reset does too — it does not depend on the button component's unmount path.

It is also an `interaction` tier capability, so `buildExtensions` wraps it in `withTransactionGuard` and every doc-changing transaction is rejected by `filterTransaction` under preview — a second layer of safety.

## Related

- [Text Formatting](./text-formatting.md)
