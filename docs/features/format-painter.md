# 格式刷

由 `features.formatPainter` 控制。

## 启用

```vue
<YanivEditor preset="full" />
```

`notion` preset **默认关闭**格式刷（与 Notion 产品对齐）。

## 使用

1. 选中带格式的文字作为源
2. **单击**顶栏格式刷（单次模式）或**双击**（连续模式）
3. 在正文里选中目标文本，松开鼠标即自动应用

第 3 步不需要再点按钮：扩展在 `mouseup` 时若发现自己仍激活且存在非空选区，就直接 `applyFormat()`。
单次模式应用一次后自动退出；连续模式会一直保持，按 **Esc** 或再次点击按钮退出。

采样内容：粗体 / 斜体 / 下划线 / 删除线 / 上下标、`textStyle` 上的颜色与字体族字号、
`highlight` 背景色、段落或标题的对齐与行高。

## 预览切换

切到 preview 时顶栏卸载，格式刷按钮随之消失。

`FormatPainter` 扩展会在退出编辑态时**自行执行** `cancelFormatPainting`（plugin `view.update` 检测 `view.editable` 由 true 变 false），清掉激活标志、采样格式与编辑区上的格式刷光标样式。状态归扩展所有，复位责任也在扩展内，不依赖按钮组件的卸载路径。

此外它属于 `interaction` tier，`buildExtensions` 为其包了 `withTransactionGuard`，preview 下任何改文档的事务都会被 `filterTransaction` 拦截——这是第二层保障。

## 相关

- [文本与排版](./text-formatting.md)
