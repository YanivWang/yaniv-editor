# 文本与排版

## Full Editor

各 preset 均支持基础文本格式。入口因 preset 而异：

| 能力                          | basic / full   | notion                   |
| ----------------------------- | -------------- | ------------------------ |
| 粗体 / 斜体 / 下划线 / 删除线 | 顶栏           | 选中文字 → 浮动菜单      |
| 文字颜色 / 高亮               | 顶栏颜色选择器 | 浮动菜单                 |
| 标题 H1–H6                    | 顶栏标题下拉   | 浮动菜单 或 `/` 选标题块 |
| 有序 / 无序 / 任务列表        | 顶栏           | 浮动菜单 或 `/`          |
| 链接                          | 顶栏           | 浮动菜单                 |
| 对齐                          | 顶栏           | **无入口**（见下）       |
| 清除格式                      | 顶栏           | **无入口**（见下）       |
| 字体族 / 字号                 | full 顶栏      | —                        |
| 上下标                        | full 顶栏      | —                        |
| 格式刷                        | full 顶栏      | —（notion 关闭）         |

浮动菜单（`FloatingMenu`）只在**存在非空文本选区**时出现，位置跟随选区；空行光标不会触发它。它包含：标题下拉、粗/斜/下划线/删除线、文字色与高亮、链接、列表，以及 AI gate 开启时的 `AiMenuButton`。

::: warning notion 下没有对齐与清除格式入口
`AlignDropdown` 与 `ClearFormatButton` 只挂在顶栏（`ToolbarNav`），而 `notion` 隐藏顶栏。浮动菜单不含这两项，块菜单（`/`）与拖拽菜单（复制块 / 删除块 / 转换为）也没有。TextAlign 扩展本身仍注册，可通过命令或快捷键使用，但没有内置按钮。
:::

```vue
<YanivEditor preset="basic" />
<YanivEditor preset="full" />
<YanivEditor preset="notion" appearance="notion" />
```

## Inline Editor

默认开启 `textFormat`（粗体、斜体、下划线、删除线）。可追加 `heading`、`list`、`align`、`font`、`clearFormat` 等。

```vue
<YanivInlineEditor
  v-model:content="html"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true, align: true }"
/>
```

## 相关

- [核心编辑](./core-editing.md)
- [格式刷](./format-painter.md)
- [Inline 工具栏](../guide/inline-toolbar.md)
