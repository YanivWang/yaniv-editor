# Word 导入导出

完整工具栏（`FULL_TOOLBAR_CONFIG`）提供 Word 文档互转能力（`WordButton`）。

## 依赖

- `mammoth` — Word (.docx) → HTML
- `docx` + `file-saver` — HTML/编辑器内容 → .docx

已作为 Yaniv Editor（`@yanivjs/yaniv-editor`）的 dependencies 打包，使用者无需单独安装。

## 功能

| 操作      | 说明                               |
| --------- | ---------------------------------- |
| 导入 Word | 上传 .docx，转换为 HTML 写入编辑器 |
| 导出 Word | 将当前文档导出为 .docx 文件下载    |

## 使用

在 `features.headerNav: true` 且完整工具栏时，会出现 Word 按钮。

也可单独使用底层 API：

```ts
import { importWordFile, convertWordToHtml, exportToWord } from "@yanivjs/yaniv-editor";

// 导入
const html = await convertWordToHtml(file);

// 导出
await exportToWord(editor.getHTML(), "my-document");
```

## 限制

- 复杂 Word 排版（分栏、文本框、艺术字等）可能丢失
- 图片需可访问的 URL 或内嵌 Base64
- 表格、列表、标题等基本结构支持较好
- 与 [Office 粘贴增强](/features/text-formatting#office-粘贴) 互补：粘贴适合片段，导入适合整篇文档

## 模板

`TemplateButton` 提供内置文档模板快速插入，适合报告、会议纪要等场景。模板定义见 `builtinTemplates`。

## 下一步

- [Full Editor](/guide/full-editor)
- [功能总览](/features/overview)
