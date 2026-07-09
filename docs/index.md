# Yaniv Editor 文档

Vue 3 + Tiptap 3 富文本编辑器，提供 **Full** 与 **Inline** 两种组件形态（当前 **v0.1.2**）。

安装 peer 依赖后即可使用，**无需**在宿主应用中全局注册 Ant Design Vue（详见 [快速开始](./guide/getting-started.md)）。

## 快速链接

| 我想…              | 从这里开始                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| 5 分钟接入         | [快速开始](./guide/getting-started.md)                                                           |
| 选 preset / 开功能 | [功能对照表](./features/feature-matrix.md)                                                       |
| 查 Props           | [YanivEditor API](./api/yaniv-editor.md)                                                         |
| Notion 块编辑      | [块编辑](./features/block-editing.md)                                                            |
| 接 AI              | [AI 辅助](./features/ai.md) + [AI 配置](./api/ai-config.md)                                      |
| 浮层 / z-index     | [Z-Index 与浮层](./guide/z-index.md)                                                             |
| 理解代码结构       | [架构设计](./contributing/architecture.md)                                                       |
| 本地体验           | 运行 `pnpm dev` → [localhost:9527](http://localhost:9527)                                        |
| 在线 Demo          | [yanivwang.github.io/yaniv-editor/examples/](https://yanivwang.github.io/yaniv-editor/examples/) |

## 组件形态

| 形态   | 导入                           | 场景              |
| ------ | ------------------------------ | ----------------- |
| Full   | `@yanivjs/yaniv-editor`        | 文档、CMS、知识库 |
| Inline | `@yanivjs/yaniv-editor/inline` | 评论、表单        |
| AI     | `@yanivjs/yaniv-editor/ai`     | 可选 AI 扩展      |

## Full Editor 四维 API

```vue
<YanivEditor
  mode="edit"
  preset="basic"
  appearance="default"
  color-mode="light"
  :features="{ table: true }"
/>
```

- `mode` — `edit | preview`
- `preset` — `basic | full | notion`
- `appearance` — `default | word | notion | custom`
- `colorMode` — `light | dark | auto`
- `features` — 能力覆盖

## 文档结构

- **指南** — 接入、外观、预览、国际化、集成、Z-Index 与浮层
- **功能** — 逐项能力说明与 preset 对照
- **API** — 组件 props、FeatureConfig、Composables
- **贡献** — 目录结构与架构设计

完整架构规范见仓库根目录 [`ARCHITECTURE.md`](https://github.com/YanivWang/yaniv-editor/blob/main/ARCHITECTURE.md)。
