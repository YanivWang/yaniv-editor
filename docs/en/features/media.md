# Media

Image and video are separate capabilities, controlled by `features.image` and `features.video` respectively.

## Enable

```vue
<YanivEditor preset="full" />
<YanivEditor preset="basic" :features="{ video: true }" />
<YanivEditor preset="full" :features="{ image: true, video: false }" />
```

## Upload

When `uploadImage` / `uploadVideo` are not provided, local uploads fall back to **DataURL**:

```vue
<YanivEditor
  preset="full"
  :upload-image="async (file) => uploadToServer(file)"
  :upload-video="async (file) => uploadToServer(file)"
/>
```

Upload callback changes **do not** trigger session rebuild; extensions read the latest reference via getters at event time.

## Image

- **Insert**: full header / notion via `/` or floating menu
- **When selected**: image context bar (`ImageToolbar`) — left / center / right alignment, preview (modal), delete
- **Resize**: drag-resize comes from `ResizableImage` (`enableResize: true`) node handles, not from the context bar
- **Paste**: the `PasteImage` extension registers alongside the `image` gate, so images can be pasted directly

## Video

- **Insert**: full header / notion block menu
- **When selected**: video context bar (`VideoToolbar`) — preview playback (modal), delete
- Videos remain playable in preview mode (`mode="preview"`)

::: warning Media context bars are not localized yet
Button `title` attributes in `ImageToolbar` / `VideoToolbar` ("预览", "删除图片", "左对齐", …) are hard-coded Chinese and do not go through `useEditorT()`. With `locale="en-US"` these tooltips still render in Chinese.
:::

## Gallery

full preset header "Gallery" collects images from the current document, or accepts an external list via `galleryImages`. See [Templates and Gallery](./templates-gallery.md).

## Related

- [Feature Matrix](./feature-matrix.md)
- [Integration Props](../guide/integration-props.md)
