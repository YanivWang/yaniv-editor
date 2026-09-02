// @vitest-environment jsdom

/**
 * 图库：从哪里取图、选了哪些、插入什么。
 *
 * 图源有两条：宿主传的 `images`，或从当前文档里扫。扫文档时按 `src` 去重
 * ——同一张图在文档里出现三次，图库里不该列三遍。
 */
import ImageExtension from "@tiptap/extension-image";
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import {
  installBrowserStubs,
  installLayoutStubs,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import GalleryButton from "./GalleryButton.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

interface GalleryImage {
  src: string;
  alt?: string;
  width?: number;
  height?: number;
}

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;

async function mountGallery(content: string, images?: GalleryImage[]): Promise<Editor> {
  const host = document.createElement("div");
  document.body.append(host);
  editor = new Editor({
    element: host,
    extensions: [StarterKit, ImageExtension.configure({ allowBase64: true })],
    content,
  });

  const currentEditor = editor;
  let localeCtx: { messages: { value: unknown } } | null = null;

  const Host = defineComponent({
    setup() {
      const root = document.createElement("div");
      root.className = EDITOR_ROOT_CLASS;
      const portal = document.createElement("div");
      portal.className = OVERLAY_PORTAL_CLASS;
      root.append(portal);
      document.body.append(root);

      provideEditorRoot(ref(root));
      provideOverlayPortal(ref(portal));
      localeCtx = provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(GalleryButton, { editor: currentEditor, images });
    },
  });

  wrapper = mount(Host, { attachTo: document.body });
  await waitForLocaleMessages(localeCtx!);
  return editor;
}

async function open(): Promise<void> {
  wrapper!.find("button").element.click();
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await nextTick();
    if (document.querySelector(".gallery-grid, .gallery-empty")) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("图库弹窗未打开");
}

function items(): HTMLButtonElement[] {
  return [...document.querySelectorAll<HTMLButtonElement>(".gallery-item")];
}

function insertButton(): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>(".gallery-footer button")][0];
  if (!found) throw new Error("没有插入按钮");
  return found;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

const threeImages =
  '<p><img src="https://a.example.com/1.png" alt="第一张"></p>' +
  '<p><img src="https://a.example.com/2.png"></p>' +
  '<p><img src="https://a.example.com/1.png" alt="重复的第一张"></p>';

describe("图源", () => {
  it("从文档里扫图，同一个 src 只列一次", async () => {
    await mountGallery(threeImages);
    await open();

    expect(items()).toHaveLength(2);
    expect(items()[0].querySelector("img")!.getAttribute("src")).toBe(
      "https://a.example.com/1.png",
    );
  });

  it("宿主传了 images 就不再扫文档", async () => {
    await mountGallery(threeImages, [{ src: "https://host.example.com/x.png", alt: "宿主的" }]);
    await open();

    expect(items()).toHaveLength(1);
    expect(items()[0].getAttribute("aria-label")).toBe("宿主的");
  });

  it("宿主传空数组时按「宿主说没有图」处理，显示空态", async () => {
    await mountGallery(threeImages, []);
    await open();

    expect(document.querySelector(".gallery-empty")).not.toBeNull();
    expect(items()).toHaveLength(0);
  });

  it("文档里没有图片时显示空态", async () => {
    await mountGallery("<p>只有文字</p>");
    await open();

    expect(document.querySelector(".gallery-empty")).not.toBeNull();
  });
});

describe("选择", () => {
  it("点一下选中，再点一下取消，aria-pressed 跟着变", async () => {
    await mountGallery(threeImages);
    await open();

    items()[0].click();
    await nextTick();
    expect(items()[0].getAttribute("aria-pressed")).toBe("true");

    items()[0].click();
    await nextTick();
    expect(items()[0].getAttribute("aria-pressed")).toBe("false");
  });

  it("一张都没选时插入按钮是禁用的", async () => {
    await mountGallery(threeImages);
    await open();

    expect(insertButton().disabled).toBe(true);

    items()[0].click();
    await nextTick();
    expect(insertButton().disabled).toBe(false);
  });

  it("重新打开图库时清掉上一次的选中", async () => {
    await mountGallery(threeImages);
    await open();
    items()[0].click();
    await nextTick();
    expect(items()[0].getAttribute("aria-pressed")).toBe("true");

    insertButton().click();
    await nextTick();
    await open();

    expect(items().every((item) => item.getAttribute("aria-pressed") === "false")).toBe(true);
  });
});

describe("插入", () => {
  it("按图库里的顺序插入，与点击先后无关", async () => {
    // 用宿主图源而不是文档里的图：文档里本来就有那些 src，按位置找会被干扰
    const target = await mountGallery("<p>空</p>", [
      { src: "https://host.example.com/a.png" },
      { src: "https://host.example.com/b.png" },
    ]);
    await open();

    // 先点第二张，再点第一张
    items()[1].click();
    items()[0].click();
    await nextTick();
    insertButton().click();
    await nextTick();

    const html = target.getHTML();
    const a = html.indexOf("a.png");
    const b = html.indexOf("b.png");
    expect(a).toBeGreaterThan(-1);
    expect(b).toBeGreaterThan(-1);
    expect(a, "第一张要排在第二张前面").toBeLessThan(b);
  });

  it("带上 alt，并在有尺寸时带上宽高", async () => {
    const target = await mountGallery("<p>空</p>", [
      { src: "https://host.example.com/x.png", alt: "描述", width: 320, height: 200 },
    ]);
    await open();
    items()[0].click();
    await nextTick();
    insertButton().click();
    await nextTick();

    const html = target.getHTML();
    expect(html).toContain('alt="描述"');
    expect(html).toContain('width="320"');
    expect(html).toContain('height="200"');
  });

  it("没有尺寸时不写空的 width/height 属性", async () => {
    const target = await mountGallery("<p>空</p>", [{ src: "https://host.example.com/y.png" }]);
    await open();
    items()[0].click();
    await nextTick();
    insertButton().click();
    await nextTick();

    expect(target.getHTML()).not.toContain("width=");
    expect(target.getHTML()).not.toContain("height=");
  });

  /**
   * ⚠️ 没有「插入后弹窗关闭」这条用例：antd 关闭弹窗依赖 CSS 过渡结束事件，
   * jsdom 不触发它——关闭后 `.ant-modal-wrap` 的 class 与 style 一个字都不变
   * （实测），从 DOM 上根本观察不到。与其留一条恒真的断言，不如说明它在这里测不了。
   * 「插入之后还能重新打开、且选中被清空」由上面那条覆盖，那条能真正转红。
   */
});
