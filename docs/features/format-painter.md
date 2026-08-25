# 格式刷

由 `features.formatPainter` 控制。

## 启用

```vue
<YanivEditor preset="full" />
```

`notion` preset **默认关闭**格式刷（与 Notion 产品对齐）。

## 使用

1. 选中带格式的文字作为源
2. 点击顶栏格式刷
3. 刷到目标选区

支持单次与连续模式（扩展内部命令）。可复制字体、颜色、行高等 mark 属性。

## 预览切换

切到 preview 时顶栏卸载，格式刷按钮随之消失。

`FormatPainter` 扩展会在退出编辑态时**自行执行** `cancelFormatPainting`（plugin `view.update` 检测 `view.editable` 由 true 变 false），清掉激活标志、采样格式与编辑区上的格式刷光标样式。状态归扩展所有，复位责任也在扩展内，不依赖按钮组件的卸载路径。

此外它属于 `interaction` tier，`buildExtensions` 为其包了 `withTransactionGuard`，preview 下任何改文档的事务都会被 `filterTransaction` 拦截——这是第二层保障。

## 相关

- [文本与排版](./text-formatting.md)
