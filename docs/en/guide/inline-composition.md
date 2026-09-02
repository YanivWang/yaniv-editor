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

The toolbar config is also the ability source for Inline Editor extension registration. For example, `toolbar.link !== true` means the link button is hidden and the link extension is not registered.

You can also build your own inline shell:

```ts
import { ref } from "vue";
import { buildExtensions, resolveInlineGates, CAPABILITIES } from "@yanivjs/yaniv-editor/inline";
import { loadLocale } from "@yanivjs/yaniv-editor";

const toolbar = { undoRedo: true, textFormat: true, link: true };
const gates = resolveInlineGates(toolbar, CAPABILITIES);

const extensions = await buildExtensions("inline", {
  gates,
  // Fully resolved locale message object (a static snapshot, not a Ref)
  locale: await loadLocale("en-US"),
  // Must be a Ref<boolean>: withTransactionGuard reads its .value
  isEditable: ref(true),
  // Never invoked on the inline path, but required by the BuildExtensionsCtx type
  blockMenuHost,
  upload: { image: () => undefined, video: () => undefined },
  galleryImages: () => [],
  // Not consumed on the inline path (mention belongs to notionBlocks), but required by the type
  mentionItems: () => undefined,
  officePaste: { onPasteFromOfficeWithImages: () => undefined },
  outline: { scrollParent: () => null, bindScrollParent: () => {} },
  aiConfig: () => undefined,
  // Inline only
  inlinePlaceholder: "Write something…",
  extraExtensions: [],
});
```

See `src/capabilities/types.ts` for the full `BuildExtensionsCtx` shape. Key points:

- `locale` is the **resolved message object**, not a locale code and not a Ref;
- `isEditable` must be a `Readonly<Ref<boolean>>` (the `interaction` tier transaction guard reads `.value`);
- `blockMenuHost` comes from `provideBlockMenuHost()`; it is never triggered on the inline path but is required by the type;
- `extraExtensions` is appended to the result only when `host === "inline"`.

`buildExtensions` and `resolveInlineGates` are the single source of truth for Inline extension registration. Do not use the removed `buildInlineExtensions` or `resolveInlineExtensionGates` APIs.
