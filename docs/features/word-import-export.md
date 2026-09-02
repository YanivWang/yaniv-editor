# Word 导入导出

Word 工具属于 **full preset 顶栏**，与 `appearance="word"` 视觉皮肤独立。

```vue
<YanivEditor preset="full" />
<YanivEditor preset="full" appearance="word" />
```

## 导入

- 格式：`.docx`
- 实现：mammoth → HTML → `setContent`
- 支持：Heading 1–6 样式映射、链接（sanitize + `target=_blank`）

顶栏 Word 按钮 → 导入 modal，支持拖拽上传。

## 导出

- 输出：`.docx`（docx + file-saver）
- 支持：H1–H6、段落对齐、粗斜体下划线删除线、上下标、链接、有序/无序列表（嵌套）、表格、代码块、blockquote、hr

顶栏 Word 按钮 → 导出 modal，可指定文件名。

::: warning 导出的覆盖边界
导出流水线（`wordExport.ts`）按 `getHTML()` 的标签逐条映射，未显式覆盖的标签走「有子节点就递归、否则丢弃」：

- **完全丢失**：图片、视频、数学公式、嵌入卡片 —— 它们渲染成没有文字内容的 `<img>` / `<video>` / 空 `<span>` / 空 `<div>`。
- **保留文字、丢失结构**：Toggle / Callout / 分栏等 Notion 容器会被拆成普通段落；提及保留 `@名称` 文本，丢失胶囊样式。
- **降级表达**：分割线导出为一行 `─` 字符，不是真正的 Word 分隔符；引用块用左缩进 + 左边框模拟。
  :::

## 与 Office 粘贴的区别

| 能力   | Word 导入导出 | Office 粘贴        |
| ------ | ------------- | ------------------ |
| 控制   | full 顶栏     | `officePaste` gate |
| 场景   | 整文件 .docx  | 剪贴板 Ctrl+V      |
| notion | ❌            | ✅                 |

## 相关

- [Office 粘贴](./office-paste.md)
