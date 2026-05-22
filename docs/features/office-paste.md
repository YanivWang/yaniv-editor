# Office 粘贴

由 `features.officePaste` 控制，增强从 Word / Excel / WPS 粘贴的内容。

## 启用

```vue
<YanivEditor preset="full" />
<YanivEditor preset="notion" />
```

## 支持

| 来源            | 行为                                                      |
| --------------- | --------------------------------------------------------- |
| Word / WPS HTML | 列表、书签、MSO 样式类、行号、图片占位等 transform 流水线 |
| Excel           | 表格结构 transform                                        |
| 含图片粘贴      | 可触发 `onPasteFromOfficeWithImages` 宿主回调提示         |

## 使用

无需额外操作：从 Office 应用复制后在编辑器内 **Ctrl/Cmd+V** 即可。gate 关闭时走浏览器默认粘贴。

## 配置

扩展内部支持逐项关闭 HTML transform（`htmlTransforms` 配置，高级集成场景）。

## 相关

- [表格](./table.md)
- [Word 导入导出](./word-import-export.md)
