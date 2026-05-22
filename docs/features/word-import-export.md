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

## 与 Office 粘贴的区别

| 能力   | Word 导入导出 | Office 粘贴        |
| ------ | ------------- | ------------------ |
| 控制   | full 顶栏     | `officePaste` gate |
| 场景   | 整文件 .docx  | 剪贴板 Ctrl+V      |
| notion | ❌            | ✅                 |

## 相关

- [Office 粘贴](./office-paste.md)
