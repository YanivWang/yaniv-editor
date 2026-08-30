# 媒体

图片与视频是独立能力，分别由 `features.image` 和 `features.video` 控制。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="basic" :features="{ video: true }" />
<YanivEditor preset="full" :features="{ image: true, video: false }" />
```

## 上传

未传 `uploadImage` / `uploadVideo` 时，本地上传回退为 **DataURL**：

```vue
<YanivEditor
  preset="full"
  :upload-image="async (file) => uploadToServer(file)"
  :upload-video="async (file) => uploadToServer(file)"
/>
```

上传回调变化**不会**触发 session 重建；扩展在事件触发时通过 getter 读取最新引用。

## 图片

- **插入**：full 顶栏 / notion 的 `/` 或悬浮菜单
- **选中后**：图片上下文条（`ImageToolbar`）— 左 / 居中 / 右对齐、预览（Modal）、删除
- **缩放**：拖拽缩放由 `ResizableImage`（`enableResize: true`）的节点手柄提供，不在上下文条里
- **粘贴**：`PasteImage` 扩展随 `image` gate 一起注册，支持直接粘贴图片

## 视频

- **插入**：full 顶栏 / notion 块菜单
- **选中后**：视频上下文条（`VideoToolbar`）— 预览播放（Modal）、删除
- 预览模式（`mode="preview"`）下视频仍可播放

::: tip 媒体上下文条已接入 i18n
`ImageToolbar` / `VideoToolbar` 的按钮文案走 `useEditorT()`，随 `locale` 切换。
:::

## 无障碍：视频字幕

`VideoToolbar` 的预览与正文中的 `<video>` **不会**自动生成 `<track>` 字幕轨道——编辑器
无从获知上传资源是否有字幕，而挂一个空轨道对屏幕阅读器反而是噪音。

字幕属于内容侧责任：请在 `uploadVideo` 返回的资源上自行提供 WebVTT，并在你的播放场景中挂载。

```ts
const uploadVideo = async (file: File) => {
  const { videoUrl } = await api.upload(file);
  // 字幕与视频一同返回，由宿主页面在自己的播放器上挂 <track>
  return videoUrl;
};
```

## 图库

full preset 顶栏「图库」从当前文档收集图片，或通过 `galleryImages` 注入外部列表。详见 [模板与图库](./templates-gallery.md)。

## 相关

- [功能对照表](./feature-matrix.md)
- [集成 Props](../guide/integration-props.md)
