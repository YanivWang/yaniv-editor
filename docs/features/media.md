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
| 未提供回调                                  | **Base64 Data URL** 嵌入文档 |

::: warning 生产环境
默认 Base64 会导致文档体积膨胀，**务必**实现 `uploadImage` 上传到 OSS/CDN。
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

在 Full Editor 中，`ImageUpload` 内置于 `ToolbarNav`，上传回调需通过扩展 ToolbarNav 或 fork 组件接入。Inline 模式可直接传 prop。

### 图片能力

- 拖拽调整大小（`ResizableImage`，`enableImageResize` 默认 true）
- 粘贴图片（`PasteImage` 扩展）
- 图片工具栏（对齐、替换等，需 `features.image` + Demo 级 tableToolbar/imageToolbar 配置）
- 支持 Base64（`allowBase64: true`）

### 关闭图片

```vue
<YanivEditor :features="{ image: false }" />
```

## 视频

- 扩展：`Video`
- 与 `features.image` 同门控
- 支持本地上传（Base64）与 URL
- 块级显示（`inline: false`）
- 工具栏：`VideoUpload` + `VideoToolbar`

## 图库

`GalleryButton` 提供内置示例图库，便于 Demo 快速插图。生产环境可替换为自有素材库组件。

## 粘贴 Office 图片

从 Word 粘贴含图片内容时，`OfficePaste` 会触发提示 Modal，引导用户单独上传图片。可在 `getExtensionsByVersion` 的 `officePaste.onPasteFromOfficeWithImages` 自定义行为。

## 相关配置

```vue
<YanivEditor
  :features="{
    image: true,
    tableToolbar: true,
  }"
/>
```

详见 [功能配置](/api/features-config)。
