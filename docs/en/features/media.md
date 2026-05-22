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
- **When selected**: image context bar — left/center/right alignment, preview, delete, drag resize
- **Paste**: supports pasted images (when `image` gate is on)

## Video

- **Insert**: full header / notion block menu
- **When selected**: video context bar — preview playback, delete
- Videos remain playable in preview mode (`mode="preview"`)

## Gallery

full preset header "Gallery" collects images from the current document, or accepts an external list via `galleryImages`. See [Templates and Gallery](./templates-gallery.md).

## Related

- [Feature Matrix](./feature-matrix.md)
- [Integration Props](../guide/integration-props.md)
