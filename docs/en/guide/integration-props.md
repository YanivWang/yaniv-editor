# Integration Props

Beyond preset / features, these props are for host integration and **typically do not trigger session rebuild** (read dynamically via getters).

## Upload

```vue
<YanivEditor
  :upload-image="async (file) => (await upload(file)).url"
  :upload-video="async (file) => (await upload(file)).url"
/>
```

Falls back to DataURL when not provided.

## Gallery

```vue
<YanivEditor :gallery-images="images" />
```

See [Templates and Gallery](../features/templates-gallery.md).

## Templates

```vue
<YanivEditor :custom-templates="templates" />
```

## AI Host Config

```vue
<YanivEditor
  preset="full"
  :features="{ ai: true }"
  :ai-config="{
    provider: 'openai',
    apiKey: process.env.OPENAI_KEY,
    model: 'gpt-4o-mini',
    storageMode: 'memory',
    showSettings: false,
  }"
/>
```

See [AI Config API](../api/ai-config.md).

## Outline Initial State

When the outline gate is on, the panel is **collapsed** by default. To open it initially:

```vue
<YanivEditor preset="full" :default-outline-expanded="true" />
```

This prop does not trigger session rebuild. See [Outline](../features/outline.md).

## Z-Index

Default overlay base is `1000`, configured via `zIndexBase` on **both** `YanivEditor` and `YanivInlineEditor` (written to `--ye-z-base` on `.yaniv-editor`). Raise it when the host page has high-stacking UI:

```vue
<YanivEditor :z-index-base="1500" />
```

Overlays mount inside the editor [overlay portal](./z-index.md) (`.yaniv-editor__overlay-portal`), not on `document.body`.

See **[Z-Index and Overlay Mounting](./z-index.md)** for the full token table, host stacking guidance, and custom-shell requirements.

## Controlled Content

```vue
<YanivEditor :initial-content="doc" @update="doc = $event" />
```

Full Editor content protocol is **JSON** (`JSONContent`). Inline uses **HTML** (`v-model:content`).

Controlled write-back uses signature deduplication to avoid cursor jumps from emit feedback. In preview mode, `ContentAdapter` can still write via raw transactions.

## Expose

```ts
const editorRef = ref<InstanceType<typeof YanivEditor>>();

editorRef.value?.getEditor(); // Tiptap Editor | null
editorRef.value?.getJSON();
editorRef.value?.getHTML();
editorRef.value?.getText();
```

## Advanced Runtime

Custom shells can use:

```ts
import {
  resolveEditorProfile,
  buildExtensions,
  CAPABILITIES,
  ContentAdapter,
  applyPhaseTransition,
} from "@yanivjs/yaniv-editor";
```

See [Composables API](../api/composables.md) and [Architecture](../contributing/architecture.md).
