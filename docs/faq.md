# FAQ

## How do I choose Full vs Inline?

Use `YanivEditor` for document editing and `YanivInlineEditor` for compact inputs.

## How do I enable all Full Editor abilities?

```vue
<YanivEditor preset="full" />
```

## How do I get a Notion-like setup?

Use `preset="notion"` for block editing behavior. Use `appearance="notion"` for the visual skin.

```vue
<YanivEditor preset="notion" appearance="notion" />
```

## How do I show content without editing chrome?

```vue
<YanivEditor mode="preview" preset="basic" :initial-content="html" />
```
