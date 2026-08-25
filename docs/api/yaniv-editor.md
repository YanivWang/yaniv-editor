# YanivEditor API

## 导入

```ts
import { YanivEditor } from "@yanivjs/yaniv-editor";
import "@yanivjs/yaniv-editor/style.css";
```

## Props

| Prop                     | 类型                                          | 默认值                         | 说明                                                       |
| ------------------------ | --------------------------------------------- | ------------------------------ | ---------------------------------------------------------- |
| `mode`                   | `"edit" \| "preview"`                         | `"edit"`                       | 运行状态                                                   |
| `preset`                 | `"basic" \| "full" \| "notion"`               | `"basic"`                      | Full Editor 功能方案                                       |
| `appearance`             | `"default" \| "word" \| "notion" \| "custom"` | `"default"`                    | 视觉皮肤                                                   |
| `colorMode`              | `"light" \| "dark" \| "auto"`                 | `"light"`                      | 颜色模式                                                   |
| `features`               | `FeatureConfig`                               | preset 默认值                  | 能力覆盖                                                   |
| `initialContent`         | `string \| JSONContent`                       | `"<p>开始编辑你的文档...</p>"` | 初始文档内容                                               |
| `customAppearanceVars`   | `Record<string, string>`                      | 无                             | 自定义外观 CSS 变量（视觉 token，不含 z-index）            |
| `zIndexBase`             | `number`                                      | `1000`                         | 浮层 z-index 基准；写入 `--ye-z-base`；不触发 session 重建 |
| `uploadImage`            | `(file: File) => Promise<string>`             | DataURL 回退                   | 图片上传处理                                               |
| `uploadVideo`            | `(file: File) => Promise<string>`             | DataURL 回退                   | 视频上传处理                                               |
| `galleryImages`          | `GalleryImage[]`                              | 当前文档图片                   | 外部图库来源                                               |
| `customTemplates`        | `TemplateItem[]`                              | 内置模板                       | 额外模板                                                   |
| `locale`                 | `string`                                      | `"zh-CN"`                      | 语言代码                                                   |
| `defaultOutlineExpanded` | `boolean`                                     | `false`                        | outline 开启时大纲面板初始展开                             |
| `aiConfig`               | `YanivEditorAiConfig`                         | 无                             | 宿主侧 AI 配置                                             |

`zIndexBase` 与浮层挂载详见 [Z-Index 与浮层](../guide/z-index.md)。

`initialContent` 名为「初始」，但它同时是**受控源**：`useControlledContent` 会 watch 它，值变化且与当前文档签名不同时通过 `ContentAdapter.setContent` 写回编辑器（`addToHistory: false`）。因此 `:initial-content="doc" @update="doc = $event"` 是可用的受控写法，签名去重会避免 emit 回流导致光标跳动。

## Events

| 事件     | 载荷          | 说明                                              |
| -------- | ------------- | ------------------------------------------------- |
| `update` | `JSONContent` | 编辑器 `update` 时派发当前文档的 ProseMirror JSON |

```vue
<YanivEditor :initial-content="doc" @update="doc = $event" />
```

Full Editor 的内容协议是 **JSON**；`initialContent` 可以传 HTML 字符串或 `JSONContent`，但 `@update` 始终派发 `JSONContent`。

## 示例

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
<YanivEditor mode="preview" preset="basic" appearance="word" color-mode="auto" />
<YanivEditor mode="edit" preset="notion" appearance="notion" color-mode="light" />
<YanivEditor appearance="custom" :custom-appearance-vars="{ '--ye-primary': '#6366f1' }" />
```

## Expose

```ts
interface YanivEditorExpose {
  getEditor: () => Editor | null;
  getJSON: () => JSONContent | null;
  getHTML: () => string;
  getText: () => string;
}
```

## 高级导出

自定义 shell 和高级集成时，根包还导出：

- `resolveEditorProfile`、`mergeFeatures`、`resolveChromePolicy`、`computeSessionKey`
- `buildExtensions`、`CAPABILITIES`、`applyGatesToToolbarConfig`、`resolveShowInlineToolbar`
- `ContentAdapter`、`applyPhaseTransition`

详见 [Composables](./composables.md)。
