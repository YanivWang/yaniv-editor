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
