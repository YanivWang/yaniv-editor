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
| Excel           | 表格结构 transform，并带入单元格背景色、对齐与字体色      |
| 含图片粘贴      | 可触发 `onPasteFromOfficeWithImages` 宿主回调提示         |

## 使用

无需额外操作：从 Office 应用复制后在编辑器内 **Ctrl/Cmd+V** 即可。gate 关闭时走浏览器默认粘贴。

## 配置

`OfficePaste` 扩展本身支持逐项关闭 HTML transform（`htmlTransforms`：`lists` / `bookmarks` / `msoStyles` / `msoHtmlClasses` / `lineNumber` / `imagePlaceholder`，默认全开）以及 `excelTablePaste` 开关。

但 registry 注册时只传了 `onPasteFromOfficeWithImages` 与跟随界面语言的 `imagePlaceholderHtml`，**`YanivEditor` 没有暴露透传其余选项的 prop**。要调整流水线，只能自行 `OfficePaste.configure({ ... })` 并接管扩展注册（自建 Shell / fork）。相关 transform 函数从 `src/extensions/office-paste` 导出，便于单测。

## 边界与容错

粘贴内容完全来自外部，流水线对畸形输入做了收敛（回归见 `officePasteRobustness.test.ts`）：

| 输入                        | 行为                                                                   |
| --------------------------- | ---------------------------------------------------------------------- |
| `mso-list:none`             | Word 用它声明「本段不是列表项」，原样保留，不转成列表                  |
| 解析不出列表 id / 层级      | 原样保留段落，不转换也不删除                                           |
| 层级超出 Word 上限（9 级）  | 钳制到 9，避免超深嵌套在序列化时递归爆栈                               |
| 写死的 `color:black`/`#000` | 抹掉，让文字回到主题色（否则深色模式下是黑底黑字）                     |
| 图片                        | 替换为占位段，文案跟随界面语言（`editor.officePasteImagePlaceholder`） |

## 相关

- [表格](./table.md)
- [Word 导入导出](./word-import-export.md)
