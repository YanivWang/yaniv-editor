# Yaniv Editor Docs

Yaniv Editor exposes two component shapes and a small, explicit API.

## Component Shapes

| Shape  | Import                                                  | Use case                                      |
| ------ | ------------------------------------------------------- | --------------------------------------------- |
| Full   | `YanivEditor` from `@yanivjs/yaniv-editor`              | Documents, CMS pages, knowledge-base articles |
| Inline | `YanivInlineEditor` from `@yanivjs/yaniv-editor/inline` | Comments, forms, compact inputs               |
| AI     | `@yanivjs/yaniv-editor/ai`                              | Optional AI extensions and UI                 |

## Full Editor

```vue
<YanivEditor mode="edit" preset="basic" appearance="word" color-mode="auto" />
```

Full Editor axes:

- `mode`: runtime state, `edit | preview`.
- `preset`: feature plan, `basic | full | notion`.
- `appearance`: visual skin, `default | word | notion | custom`.
- `colorMode`: `light | dark | auto`.
- `features`: ability overrides.

## Inline Editor

```vue
<YanivInlineEditor v-model:content="html" mode="edit" />
```

Inline Editor has no preset layer. Use `toolbar` for detailed toolbar control.

Inline toolbar switches also drive the Inline extension set, keeping visible controls and registered editing capabilities aligned.

## AI

AI is not enabled by any preset by default:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

Import AI modules from `@yanivjs/yaniv-editor/ai`.
