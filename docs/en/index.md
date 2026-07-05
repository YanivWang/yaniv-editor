# Yaniv Editor Docs

Vue 3 + Tiptap 3 rich text editor with **Full** and **Inline** component shapes (current **v0.1.2**).

After installing peer dependencies, you do **not** need global Ant Design Vue registration in the host app (see [Getting Started](./guide/getting-started.md)).

## Quick Links

| I want to…                    | Start here                                                                                       |
| ----------------------------- | ------------------------------------------------------------------------------------------------ |
| Get started in 5 minutes      | [Getting Started](./guide/getting-started.md)                                                    |
| Pick preset / enable features | [Feature Matrix](./features/feature-matrix.md)                                                   |
| Look up props                 | [YanivEditor API](./api/yaniv-editor.md)                                                         |
| Notion-style block editing    | [Block Editing](./features/block-editing.md)                                                     |
| Integrate AI                  | [AI Assistance](./features/ai.md) + [AI Config](./api/ai-config.md)                              |
| Understand code structure     | [Architecture](./contributing/architecture.md)                                                   |
| Try locally                   | Run `pnpm dev` → [localhost:9527](http://localhost:9527)                                         |
| Live demo                     | [yanivwang.github.io/yaniv-editor/examples/](https://yanivwang.github.io/yaniv-editor/examples/) |

## Component Shapes

| Shape  | Import                         | Use case                       |
| ------ | ------------------------------ | ------------------------------ |
| Full   | `@yanivjs/yaniv-editor`        | Documents, CMS, knowledge base |
| Inline | `@yanivjs/yaniv-editor/inline` | Comments, forms                |
| AI     | `@yanivjs/yaniv-editor/ai`     | Optional AI extensions         |

## Full Editor Four-Axis API

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
- `features` — capability overrides

## Documentation Structure

- **Guide** — integration, appearance, preview, i18n, integration props
- **Features** — per-capability docs and preset matrix
- **API** — component props, FeatureConfig, composables
- **Contributing** — project structure and architecture

Full architecture spec: repository root [`ARCHITECTURE.md`](https://github.com/YanivWang/yaniv-editor/blob/main/ARCHITECTURE.md).
