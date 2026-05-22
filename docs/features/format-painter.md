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

切到 preview 时会执行 `cancelFormatPainting` 清理格式刷状态。

## 相关

- [文本与排版](./text-formatting.md)
