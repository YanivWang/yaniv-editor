# Templates and Gallery

These are **not** `FeatureConfig` keys—they are controlled by the **full preset header**.

## Document Templates

```vue
<YanivEditor preset="full" :custom-templates="extraTemplates" />
```

- Header "Templates" button opens the template list
- 5 built-in preset document structures
- `customTemplates` are appended after the built-in list

## Image Gallery

```vue
<YanivEditor
  preset="full"
  :gallery-images="[{ src: 'https://example.com/a.jpg', alt: 'Example' }]"
/>
```

- Requires the `image` gate to be enabled
- When `galleryImages` is not passed, scans **current document** for existing images
- Supports multi-select insert

## Related

- [Media](./media.md)
- [Integration Props](../guide/integration-props.md)
