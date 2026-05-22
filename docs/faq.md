# 常见问题

## Full 还是 Inline？

- **文档 / 长文 / 富能力** → `YanivEditor`
- **评论 / 表单 / 紧凑输入** → `YanivInlineEditor`

## 如何启用全部 Full 能力？

```vue
<YanivEditor preset="full" />
```

AI 需额外开启：

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

## Notion 风格怎么配？

- **块编辑行为** → `preset="notion"`
- **视觉皮肤** → `appearance="notion"`

```vue
<YanivEditor preset="notion" appearance="notion" :ai-config="aiConfig" />
```

## 只读展示？

```vue
<YanivEditor mode="preview" :initial-content="html" />
```

链接可点、视频可播。详见 [预览模式](./guide/preview-mode.md)。

## basic 没有表格/视频？

v0.1.0 起 basic 默认仅 **image**。恢复旧行为：

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

## appearance 和 preset 的 notion 有什么区别？

- `preset="notion"` — 功能方案（斜杠、拖拽、AI 等）
- `appearance="notion"` — 仅 CSS 皮肤

可独立组合。见 [外观与颜色](./guide/appearance.md)。

## 上传走自己的 OSS？

传 `uploadImage` / `uploadVideo`，见 [集成 Props](./guide/integration-props.md)。

## 多语言？

`:locale="zh-CN"` 或 `"en-US"`，见 [国际化](./guide/i18n.md)。

## 自定义 Inline 工具栏？

见 [Inline 工具栏](./guide/inline-toolbar.md) 与 [Inline 按需拼装](./guide/inline-composition.md)。

## 在哪看完整功能列表？

[功能对照表](./features/feature-matrix.md)

## 架构 / 贡献代码从哪看？

[架构设计](./contributing/architecture.md) 与根目录 `ARCHITECTURE.md`。
