// @vitest-environment jsdom

/**
 * AI 菜单：翻译目标语言的显示与存储，以及命令的排队/取消。
 *
 * 重点是**目标语言存代码、显示时按当前 locale 翻译**。早先存的是界面标签，
 * 切换编辑器语言后按钮会显示成「Translate to 英语」，菜单里的选中标记也丢失
 * （标签随 locale 变而代码不变）。
 *
 * ⚠️ 捕获 props 的桩必须写在 `render` 里。写在 `setup` 里只拿得到首帧，
 * 那样的桩**测不出「切了 locale 却没更新」这类缺陷**（阶段 D 踩过）。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { computed, defineComponent, h, nextTick, ref } from "vue";

import type { MenuItemConfig } from "@/configs/toolbarTypes";
import { provideYanivAiShowSettings } from "@/core/aiContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import AiMenuButton from "./AiMenuButton.vue";
import { clearTranslateLang, currentTranslateLang, setTranslateLang } from "./translation";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

const captured = ref<MenuItemConfig[]>([]);
const emitted: Array<[string, string]> = [];

const DropdownStub = defineComponent({
  props: { items: { type: Array, default: () => [] } },
  emits: ["select", "splitPrimary", "openChange"],
  setup(props, { emit }) {
    // 在 render 里捕获：setup 只跑一次，拿不到后续更新
    return () => {
      captured.value = props.items as MenuItemConfig[];
      return h("div", {
        onClick: () => emit("select", "polish"),
      });
    };
  },
});

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;

function findItem(key: string): MenuItemConfig | undefined {
  return captured.value.find((item) => item.key === key);
}

/**
 * 语言包是 `await import()` 的，一次 flush 等不到——首次加载要真正解析模块，
 * 切 locale 时还要再解析另一份。
 *
 * ⚠️ 判据不能写成「文案不再是原始 key」：切 locale 时旧文案本来就已经不是 key 了，
 * 那样会立刻返回，把「等得不够」和「真的不更新」混为一谈。这里等的是**指定的变化**。
 */
async function waitUntil(predicate: () => boolean, what: string): Promise<void> {
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await flushPromises();
    await nextTick();
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`${what} 未在预期内出现；当前 translate 文案: ${findItem("translate")?.label}`);
}

function waitForLocale(): Promise<void> {
  return waitUntil(
    () => !String(findItem("translate")?.label ?? "editor.x").startsWith("editor."),
    "locale 就绪",
  );
}

/** AI 命令要等菜单关闭动画让出一帧（nextTick + requestAnimationFrame）才执行 */
async function flushCommandQueue(): Promise<void> {
  await nextTick();
  await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  await nextTick();
}

async function mountMenu(locale: string, showSettings = false) {
  const localeRef = ref<string | undefined>(locale);
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({ element: el, extensions: [StarterKit], content: "<p>一二三</p>" });

  const currentEditor = editor;
  const Host = defineComponent({
    setup() {
      provideEditorLocale(localeRef);
      provideYanivAiShowSettings(computed(() => showSettings));
      return () => h(AiMenuButton, { editor: currentEditor });
    },
  });

  wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { ToolbarDropdownButton: DropdownStub, AiSettingsModal: true } },
  });
  await waitForLocale();
  return { localeRef };
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  emitted.length = 0;
  clearTranslateLang();
  document.body.innerHTML = "";
});

describe("AI 菜单的翻译语言", () => {
  it("未选过语言时显示通用文案，没有选中项", async () => {
    await mountMenu("zh-CN");

    const translate = findItem("translate")!;
    expect(translate.label).toBe("翻译");
    expect(translate.selectedChildKey).toBe("");
  });

  it("选中的语言按代码标记，标签取当前 locale 的语言名", async () => {
    setTranslateLang("ja");
    await mountMenu("zh-CN");

    const translate = findItem("translate")!;
    expect(translate.selectedChildKey).toBe("translate-ja");
    expect(translate.label).toBe("翻译为 日语");
  });

  it("切换编辑器语言后，翻译目标的显示名跟着变，选中标记不丢", async () => {
    setTranslateLang("ja");
    const { localeRef } = await mountMenu("zh-CN");
    expect(findItem("translate")!.label).toBe("翻译为 日语");

    localeRef.value = "en-US";
    await waitUntil(
      () => String(findItem("translate")?.label ?? "").startsWith("Translate"),
      "英文文案",
    );

    const translate = findItem("translate")!;
    expect(translate.label, "标签必须换成英文界面的语言名").toBe("Translate to Japanese");
    expect(translate.selectedChildKey, "选中标记按代码走，不该丢").toBe("translate-ja");
  });

  it("子菜单每种语言各一项，key 是代码", async () => {
    await mountMenu("zh-CN");

    const children = findItem("translate")!.children!;
    expect(children.length).toBeGreaterThanOrEqual(15);
    expect(children.some((child) => child.key === "translate-zh-TW")).toBe(true);
    expect(children.find((child) => child.key === "translate-ja")!.label).toBe("日语");
  });

  it("选一种语言后存的是代码而不是显示名", async () => {
    await mountMenu("zh-CN");

    // 走组件的 select 通路
    wrapper!.findComponent(DropdownStub).vm.$emit("select", "translate-ko");
    await flushCommandQueue();

    expect(currentTranslateLang.value).toBe("ko");
  });
});

describe("AI 菜单的菜单项", () => {
  it("默认五项，不含设置入口", async () => {
    await mountMenu("zh-CN");

    expect(captured.value.map((item) => item.key)).toEqual([
      "continueWriting",
      "polish",
      "summarize",
      "customAi",
      "translate",
    ]);
  });

  it("宿主开启设置入口时追加一项", async () => {
    await mountMenu("zh-CN", true);

    expect(captured.value.map((item) => item.key)).toContain("settings");
  });

  it("英文 locale 下所有文案都解析得出（不出现原始 key）", async () => {
    await mountMenu("en-US", true);

    for (const item of captured.value) {
      expect(String(item.label), `${item.key} 的文案未解析`).not.toMatch(/^(editor|aiSettings)\./);
    }
  });
});
