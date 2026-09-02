import type { Decoration } from "@tiptap/pm/view";

/** 节点装饰里被容器节点视图消费的属性 */
interface DecorationAttrs {
  class?: string;
  "data-placeholder"?: string;
}

/**
 * 把 ProseMirror 节点装饰的 `class` / `data-placeholder` 同步到节点视图外层 dom。
 *
 * toggle 与 callout 的空态 placeholder 都由 `YanivPlaceholder` 以节点装饰下发
 * （`CONTAINER_PLACEHOLDER_TYPES`），两个节点视图各写一份「读装饰 → 写 DOM」是重复实现，
 * 这里收成一处。
 *
 * 类采用**增量**改写而不是 `dom.className = ...` 整体赋值：外层 dom 上还可能有别人挂的类
 * （ProseMirror 选中节点时加的 `ProseMirror-selectednode`、宿主自己加的类），整体赋值会一并抹掉，
 * 而自定义节点视图的 `update()` 返回 `true` 后，PM 的 `updateOuterDeco` 在装饰未变时提前返回，
 * 不会替我们补回来。
 *
 * （实测当前仓库触发不到这个丢失：`update()` 只在该节点自身重渲时才跑，而改节点属性的
 * `setNodeMarkup` / `updateAttributes` 本身就会把 NodeSelection 降级成 TextSelection，
 * 选中类本就该摘掉。增量改写是防御性的，不是在修一个已知缺陷。）
 *
 * @param dom 节点视图外层元素；基础类（如 `toggle-block`）由调用方自行设置
 * @returns 传入当前装饰列表即可完成一次同步
 */
export function createNodeDecorationApplier(
  dom: HTMLElement,
): (decorations: readonly Decoration[]) => void {
  let applied: string[] = [];

  return (decorations) => {
    const next: string[] = [];
    let placeholder: string | null = null;

    for (const deco of decorations) {
      const attrs = (deco as { type?: { attrs?: DecorationAttrs } }).type?.attrs;
      if (!attrs) continue;
      if (attrs.class) next.push(...attrs.class.split(/\s+/).filter(Boolean));
      if (attrs["data-placeholder"]) placeholder = attrs["data-placeholder"];
    }

    for (const cls of applied) {
      if (!next.includes(cls)) dom.classList.remove(cls);
    }
    for (const cls of next) dom.classList.add(cls);
    applied = next;

    if (placeholder) dom.setAttribute("data-placeholder", placeholder);
    else dom.removeAttribute("data-placeholder");
  };
}
