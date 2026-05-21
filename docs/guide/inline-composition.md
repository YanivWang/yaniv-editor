# Inline Composition

Inline Editor has no preset layer. The default toolbar is comment-like:

```ts
{
  undoRedo: true,
  textFormat: true,
  link: true,
}
```

For detailed control, pass `toolbar`.

```vue
<YanivInlineEditor
  v-model:content="html"
  mode="edit"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true }"
/>
```

The toolbar config is also the ability source for Inline Editor extension registration. For example, `toolbar.link !== true` means the link button is hidden and the link extension is not registered by the default inline builder.

You can also build your own inline shell:

```ts
import { buildInlineExtensions, resolveInlineExtensionGates } from "@yanivjs/yaniv-editor/inline";

const toolbar = { undoRedo: true, textFormat: true, link: true };

const extensions = buildInlineExtensions({
  gates: resolveInlineExtensionGates({ toolbar }),
});
```
