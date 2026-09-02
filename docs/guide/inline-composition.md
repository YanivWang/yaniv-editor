# Inline 按需拼装

Inline Editor 没有 preset 层，默认工具栏类似评论输入框：

```ts
{
  undoRedo: true,
  textFormat: true,
  link: true,
}
```

精细控制时传入 `toolbar`：

```vue
<YanivInlineEditor
  v-model:content="html"
  mode="edit"
  :toolbar="{ undoRedo: true, textFormat: true, link: true, list: true }"
/>
```

工具栏配置同时也是 Inline 扩展注册的能力来源。例如 `toolbar.link !== true` 表示隐藏链接按钮且不注册链接扩展。

也可以自行组装 inline shell：

```ts
import { ref } from "vue";
import { buildExtensions, resolveInlineGates, CAPABILITIES } from "@yanivjs/yaniv-editor/inline";
import { loadLocale } from "@yanivjs/yaniv-editor";

const toolbar = { undoRedo: true, textFormat: true, link: true };
const gates = resolveInlineGates(toolbar, CAPABILITIES);

const extensions = await buildExtensions("inline", {
  gates,
  // 已解析的整份 locale 消息对象（静态快照，非 Ref）
  locale: await loadLocale("zh-CN"),
  // 必须是 Ref<boolean>：withTransactionGuard 会读它的 .value
  isEditable: ref(true),
  // Inline 下不会被调用，但 BuildExtensionsCtx 类型要求存在
  blockMenuHost,
  upload: { image: () => undefined, video: () => undefined },
  galleryImages: () => [],
  // Inline 下不会被消费（mention 属于 notionBlocks 能力），但类型要求存在
  mentionItems: () => undefined,
  officePaste: { onPasteFromOfficeWithImages: () => undefined },
  outline: { scrollParent: () => null, bindScrollParent: () => {} },
  aiConfig: () => undefined,
  // Inline 专用
  inlinePlaceholder: "写点什么…",
  extraExtensions: [],
});
```

`BuildExtensionsCtx` 的完整字段见 `src/capabilities/types.ts`。要点：

- `locale` 是**已解析的消息对象**，不是 locale code，也不是 Ref；
- `isEditable` 必须是 `Readonly<Ref<boolean>>`（`interaction` tier 的事务守卫读 `.value`）；
- `blockMenuHost` 由 `provideBlockMenuHost()` 返回，Inline 路径下不会被触发，但类型上是必填的；
- 只有 `host === "inline"` 时 `extraExtensions` 才会被追加到结果末尾。

`buildExtensions` 和 `resolveInlineGates` 是 Inline 扩展注册的唯一来源。请勿使用已移除的 `buildInlineExtensions` 或 `resolveInlineExtensionGates` API。
