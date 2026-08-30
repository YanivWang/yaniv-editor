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

::: tip Media context bars are localised
`ImageToolbar` / `VideoToolbar` labels go through `useEditorT()` and follow `locale`.
:::

## Accessibility: video captions

The `<video>` elements rendered by `VideoToolbar` and in the document do **not** get an
automatic `<track>`. The editor cannot know whether an uploaded asset ships captions, and an
empty track is noise for screen readers.

Captions are a content-side responsibility: return a WebVTT alongside the asset from your
`uploadVideo` handler and attach it in your own playback surface.

```ts
const uploadVideo = async (file: File) => {
  const { videoUrl } = await api.upload(file);
  return videoUrl;
};
```

## Gallery

full preset header "Gallery" collects images from the current document, or accepts an external list via `galleryImages`. See [Templates and Gallery](./templates-gallery.md).

## Related

- [Feature Matrix](./feature-matrix.md)
- [Integration Props](../guide/integration-props.md)
