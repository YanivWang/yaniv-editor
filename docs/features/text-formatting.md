# 文本与排版

## Full Editor

各 preset 均支持基础文本格式。入口因 preset 而异：

| 能力                          | basic / full   | notion                  |
| ----------------------------- | -------------- | ----------------------- |
| 粗体 / 斜体 / 下划线 / 删除线 | 顶栏           | 选中文字 → 行首悬浮菜单 |
| 文字颜色 / 高亮               | 顶栏颜色选择器 | 悬浮菜单                |
| 标题 H1–H6                    | 顶栏标题下拉   | 输入 `/` 选标题块       |
| 有序 / 无序 / 任务列表        | 顶栏           | 输入 `/` 或悬浮菜单     |
| 对齐                          | 顶栏           | 块菜单 / 悬浮菜单       |
| 清除格式                      | 顶栏           | 悬浮菜单 / 块菜单       |
| 字体族 / 字号                 | full 顶栏      | —                       |
| 上下标                        | full 顶栏      | —                       |
| 格式刷                        | full 顶栏      | —（notion 关闭）        |

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
