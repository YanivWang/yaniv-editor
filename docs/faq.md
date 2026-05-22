# FAQ

## How do I choose Full vs Inline?

Use `YanivEditor` for document editing and `YanivInlineEditor` for compact inputs.

## How do I enable all Full Editor abilities?

```vue
<YanivEditor preset="full" />
```

AI is not part of the `full` preset defaults. Enable it explicitly:

```vue
<YanivEditor preset="full" :features="{ ai: true }" :ai-config="aiConfig" />
```

## How do I get a Notion-like setup?

Use `preset="notion"` for block editing behavior. Use `appearance="notion"` for the visual skin.

`notion` enables AI by default; pass `:ai-config` for a working provider:

```vue
<YanivEditor preset="notion" appearance="notion" :ai-config="aiConfig" />
```

## How do I show content without editing chrome?

```vue
<YanivEditor mode="preview" preset="basic" :initial-content="html" />
```
