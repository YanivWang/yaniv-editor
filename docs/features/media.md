# 媒体

Yaniv Editor 支持图片与视频的插入、缩放及上下文工具栏。

## 图片

### 插入方式

通过工具栏 `ImageUpload` 组件：

1. **本地上传** — 选择或拖拽图片文件
2. **网络 URL** — 输入图片地址

### 上传行为

```vue
<ImageUpload :editor="editor" :upload-image="uploadToOss" />
```

| 情况                                        | 行为                         |
| ------------------------------------------- | ---------------------------- |
| 提供 `uploadImage(file) => Promise<string>` | 使用返回的 URL 插入          |
| 未提供回调                                  | 小图可回退为 Base64 Data URL |

::: warning 生产环境
Base64 会导致文档体积膨胀；大图会被拦截，生产环境应实现 `uploadImage` 上传到 OSS/CDN。
:::

### 示例：OSS 上传

```ts
async function uploadImage(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: form });
  const { url } = await res.json();
  return url;
}
```

在 Full Editor 中可直接传入 `uploadImage`：

```vue
<YanivEditor v-bind="editorPresets.production" :upload-image="uploadImage" />
```

### 图片能力

- 拖拽调整大小（`ResizableImage`，`enableResize` 默认 true）
- 粘贴图片（`PasteImage` 扩展）
- 图片工具栏（对齐、替换等，需 `features.image`）
- 支持 Base64（`allowBase64: true`）

### 关闭图片

```vue
<YanivEditor :features="{ image: false }" />
```

## 视频

- 扩展：`Video`
- 由 `features.video` 独立门控
- 支持本地上传；必须提供 `uploadVideo(file) => Promise<string>`，不再回退为 Base64
- 块级显示（`inline: false`）
- 工具栏：`VideoUpload` + `VideoToolbar`
- Full Editor 可通过 `uploadVideo(file) => Promise<string>` 透传上传逻辑

## 图库

`GalleryButton` 默认从当前文档提取图片，也可通过 Full Editor 的 `galleryImages` prop 传入外部图库。

## 粘贴 Office 图片

从 Word 粘贴含图片内容时，`OfficePaste` 会触发提示 Modal，引导用户单独上传图片。可在 `buildEditorExtensions` 的 `officePaste.onPasteFromOfficeWithImages` 自定义行为。

## 相关配置

```vue
<YanivEditor
  :features="{
    image: true,
    video: true,
    tableToolbar: true,
  }"
  :upload-image="uploadImage"
  :upload-video="uploadVideo"
/>
```

详见 [功能配置](/api/features-config)。
