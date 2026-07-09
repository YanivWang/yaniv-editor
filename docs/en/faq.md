# FAQ

## Full or Inline?

- **Documents / long-form / rich capabilities** → `YanivEditor`
- **Comments / forms / compact input** → `YanivInlineEditor`

## How do I enable all Full Editor capabilities?

```vue
<YanivEditor preset="full" />
```

AI requires additional setup:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

## How do I get a Notion-like setup?

- **Block editing behavior** → `preset="notion"`
- **Visual skin** → `appearance="notion"`

```vue
<YanivEditor preset="notion" appearance="notion" :ai-config="aiConfig" />
```

## Read-only display?

```vue
<YanivEditor mode="preview" :initial-content="html" />
```

Links are clickable and videos are playable. See [Preview Mode](./guide/preview-mode.md).

## Do I need to globally register Ant Design Vue?

No. After installing peer dependencies, the library registers Ant Design Vue components locally in each UI shell via `src/shared/antd.ts`—the host app does **not** need `app.use(Antd)`. This also applies to Nuxt projects using `@ant-design-vue/nuxt`.

## Why doesn't basic have table/video?

Since v0.1.0, basic defaults to **image** only. Restore previous behavior:

```vue
<YanivEditor preset="basic" :features="{ table: true, video: true }" />
```

## What's the difference between appearance and preset notion?

- `preset="notion"` — feature plan (slash command, drag handle, AI, etc.)
- `appearance="notion"` — CSS skin only

They can be combined independently. See [Appearance and Color](./guide/appearance.md).

## Upload to my own OSS?

Pass `uploadImage` / `uploadVideo`. See [Integration Props](./guide/integration-props.md).

## Multi-language?

`:locale="zh-CN"` or `"en-US"`. See [Internationalization](./guide/i18n.md).

## Host Modal covers editor overlays / how to configure z-index?

Default `zIndexBase` is `1000`; overlays mount inside the editor overlay portal. For host global modals to fully cover the editor, use z-index above `zIndexBase + 100` (default **1100**), or lower the editor `zIndexBase`. See [Z-Index & Overlays](./guide/z-index.md).

## Custom Inline toolbar?

See [Inline Toolbar](./guide/inline-toolbar.md) and [Inline Composition](./guide/inline-composition.md).

## Where is the full feature list?

[Feature Matrix](./features/feature-matrix.md)

## Where to read architecture / contribute?

[Architecture](./contributing/architecture.md) and root `ARCHITECTURE.md`.
