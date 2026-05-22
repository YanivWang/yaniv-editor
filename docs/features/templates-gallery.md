# 模板与图库

这两项**不是** `FeatureConfig` 键，由 **full preset 顶栏**控制。

## 文档模板

```vue
<YanivEditor preset="full" :custom-templates="extraTemplates" />
```

- 顶栏「模板」按钮打开模板列表
- 内置 5 个预设文档结构
- `customTemplates` 追加到内置列表末尾

## 图库

```vue
<YanivEditor preset="full" :gallery-images="[{ src: 'https://example.com/a.jpg', alt: '示例' }]" />
```

- 依赖 `image` gate 开启
- 未传 `galleryImages` 时，从**当前文档**扫描已有图片
- 支持多选插入

## 相关

- [媒体](./media.md)
- [集成 Props](../guide/integration-props.md)
