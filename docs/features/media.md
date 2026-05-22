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
- **选中后**：图片上下文条 — 左/中/右对齐、预览、删除、拖拽缩放
- **粘贴**：支持粘贴图片（`image` gate 开启时）

## 视频

- **插入**：full 顶栏 / notion 块菜单
- **选中后**：视频上下文条 — 预览播放、删除
- 预览模式（`mode="preview"`）下视频仍可播放

## 图库

full preset 顶栏「图库」从当前文档收集图片，或通过 `galleryImages` 注入外部列表。详见 [模板与图库](./templates-gallery.md)。

## 相关

- [功能对照表](./feature-matrix.md)
- [集成 Props](../guide/integration-props.md)
