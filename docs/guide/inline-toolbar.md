# Inline 工具栏

Inline Editor 通过 `toolbar: InlineToolbarConfig` 控制工具栏与扩展注册。

## 默认

```ts
{ undoRedo: true, textFormat: true, link: true }
```

## 全部开关

| 键            | 扩展 / UI                    | 说明                   |
| ------------- | ---------------------------- | ---------------------- |
| `undoRedo`    | StarterKit history           | 撤销 / 重做            |
| `heading`     | StarterKit heading           | 标题级别               |
| `textFormat`  | bold/italic/underline/strike | 文本格式               |
| `list`        | TaskList                     | 有序 / 无序 / 任务列表 |
| `align`       | TextAlign                    | 对齐                   |
| `link`        | Link + 链接气泡              | 插入链接               |
| `clearFormat` | —                            | 清除格式               |
| `font`        | FontFamily + FontSize        | 字体族与字号           |
| `codeBlock`   | codeBlockLowlight            | 代码块                 |

**规则**：`toolbar.x !== true` 时，对应按钮隐藏且扩展不注册。

## 示例

```vue
<YanivInlineEditor
  v-model:content="html"
  mode="edit"
  placeholder="写评论…"
  :toolbar="{
    undoRedo: true,
    heading: true,
    textFormat: true,
    list: true,
    align: true,
    link: true,
    clearFormat: true,
    font: false,
    codeBlock: false,
  }"
/>
```

## 自定义插槽

使用 `#toolbar` 插槽 + 原子组件自行拼装，见 [Inline 按需拼装](./inline-composition.md)。

## 预览

`mode="preview"` 时不渲染内置工具栏与 `#toolbar` slot。

## 相关

- [YanivInlineEditor API](../api/yaniv-inline-editor.md)
- [文本与排版](../features/text-formatting.md)
