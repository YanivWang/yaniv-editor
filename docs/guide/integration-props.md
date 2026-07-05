# 集成 Props

除 preset / features 外，以下 props 用于宿主集成，**通常不触发 session 重建**（getter 动态读取）。

## 上传

```vue
<YanivEditor
  :upload-image="async (file) => (await upload(file)).url"
  :upload-video="async (file) => (await upload(file)).url"
/>
```

未传时回退 DataURL。

## 图库

```vue
<YanivEditor :gallery-images="images" />
```

见 [模板与图库](../features/templates-gallery.md)。

## 模板

```vue
<YanivEditor :custom-templates="templates" />
```

## AI 托管

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

见 [AI 配置 API](../api/ai-config.md)。

## 大纲初始展开

outline 能力开启时，面板默认**收起**。需要初始展开时：

```vue
<YanivEditor preset="full" :default-outline-expanded="true" />
```

该 prop 不触发 session rebuild。详见 [大纲目录](../features/outline.md)。

## 受控内容

```vue
<YanivEditor :initial-content="doc" @update="doc = $event" />
```

Full Editor 内容协议为 **JSON**（`JSONContent`）。Inline 为 **HTML**（`v-model:content`）。

受控回写带签名去重，避免 emit 回流导致光标跳动。preview 模式下 `ContentAdapter` 仍可通过 raw transaction 写入。

## Expose

```ts
const editorRef = ref<InstanceType<typeof YanivEditor>>();

editorRef.value?.getEditor(); // Tiptap Editor | null
editorRef.value?.getJSON();
editorRef.value?.getHTML();
editorRef.value?.getText();
```

## 高级运行时

自定义 shell 可使用：

```ts
import {
  resolveEditorProfile,
  buildExtensions,
  CAPABILITIES,
  ContentAdapter,
  applyPhaseTransition,
} from "@yanivjs/yaniv-editor";
```

见 [Composables API](../api/composables.md) 与 [架构设计](../contributing/architecture.md)。
