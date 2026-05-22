# YanivInlineEditor API

## 导入

```ts
import { YanivInlineEditor } from "@yanivjs/yaniv-editor/inline";
import "@yanivjs/yaniv-editor/inline.css";
```

## Props

| Prop              | 类型                          | 默认值                      | 说明                              |
| ----------------- | ----------------------------- | --------------------------- | --------------------------------- |
| `content`         | `string`                      | `"<p></p>"`                 | HTML 内容，支持 `v-model:content` |
| `mode`            | `"edit" \| "preview"`         | `"edit"`                    | 运行状态                          |
| `colorMode`       | `"light" \| "dark" \| "auto"` | `"light"`                   | 颜色模式                          |
| `toolbar`         | `InlineToolbarConfig`         | 撤销/重做 + 文本格式 + 链接 | 工具栏控件                        |
| `placeholder`     | `string`                      | 无                          | 空段落提示                        |
| `extraExtensions` | `AnyExtension[]`              | `[]`                        | 额外 Tiptap 扩展                  |
| `editorProps`     | `Record<string, unknown>`     | 无                          | Tiptap editor props               |
| `locale`          | `string`                      | `"zh-CN"`                   | 语言代码                          |

## 示例

```vue
<YanivInlineEditor v-model:content="html" mode="edit" />
<YanivInlineEditor :content="html" mode="preview" color-mode="auto" />
```

自定义工具栏：

```vue
<YanivInlineEditor
  v-model:content="html"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true }"
/>
```

`mode="preview"` 时不渲染内置工具栏和自定义工具栏 slot。内容仍可选择，链接保持正常文档链接行为。

## 高级导出

inline 入口还导出用于自定义 inline shell 的构建块：

```ts
import {
  InlineToolbar,
  UndoRedoButton,
  LinkButton,
  buildExtensions,
  resolveInlineGates,
  resolveShowInlineToolbar,
  CAPABILITIES,
  provideYanivEditor,
  useYanivEditor,
} from "@yanivjs/yaniv-editor/inline";
```

完整自定义 shell 示例见 [Inline 按需拼装](../guide/inline-composition.md)。
