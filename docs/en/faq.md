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

## Custom Inline toolbar?

See [Inline Toolbar](./guide/inline-toolbar.md) and [Inline Composition](./guide/inline-composition.md).

## Where is the full feature list?

[Feature Matrix](./features/feature-matrix.md)

## Where to read architecture / contribute?

[Architecture](./contributing/architecture.md) and root `ARCHITECTURE.md`.
