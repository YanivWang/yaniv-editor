// @vitest-environment jsdom

/**
 * Word 导入用 `setContent` **替换整个文档**，当前内容全部丢失且回不去。
 * 文档非空时必须先确认；空文档没什么可覆盖的，直接导入不打断用户。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent, h, ref } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import WordButton from "./WordButton.vue";

import type { VueWrapper } from "@vue/test-utils";

const importWordFile = vi.fn(async () => ({ html: "<p>导入的内容</p>", messages: [] }));

vi.mock("./wordImport", () => ({
  importWordFile: (...args: unknown[]) => importWordFile(...(args as [])),
  convertWordToHtml: vi.fn(),
}));

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

const editors: Editor[] = [];
let wrapper: VueWrapper | null = null;

function mountButton(content: string) {
  const root = document.createElement("div");
  root.className = EDITOR_ROOT_CLASS;
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  root.append(portal);
  const host = document.createElement("div");
  root.append(host);
  document.body.append(root);

  const editor = new Editor({ element: host, extensions: [StarterKit], content });
  editors.push(editor);

  wrapper = mount(
    defineComponent({
      setup() {
        provideEditorRoot(ref(root));
        provideOverlayPortal(ref(portal));
        provideEditorLocale(ref("zh-CN"));
        return () => h(WordButton, { editor });
      },
    }),
    { attachTo: document.body },
  );
  return { editor, wrapper };
}

/** 直接调组件暴露的 customRequest —— antd 的 dragger 在 jsdom 里走不通完整链路 */
async function triggerUpload(w: VueWrapper, onSuccess = vi.fn(), onError = vi.fn()) {
  const vm = w.findComponent(WordButton).vm as unknown as {
    handleImport: (options: unknown) => Promise<void>;
  };
  const file = new File(["x"], "a.docx");
  await vm.handleImport({ file, onSuccess, onError });
  await flushPromises();
  return { onSuccess, onError };
}

function confirmState(w: VueWrapper) {
  const vm = w.findComponent(WordButton).vm as unknown as { replaceConfirmOpen: boolean };
  return vm.replaceConfirmOpen;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  while (editors.length) editors.pop()?.destroy();
  document.body.innerHTML = "";
  importWordFile.mockClear();
});

describe("Word 导入的覆盖确认", () => {
  it("文档非空时先弹确认，不立即导入", async () => {
    const { wrapper: w } = mountButton("<p>我辛苦写的内容</p>");
    await triggerUpload(w);

    expect(confirmState(w)).toBe(true);
    expect(importWordFile).not.toHaveBeenCalled();
  });

  it("确认后才真正导入", async () => {
    const { wrapper: w } = mountButton("<p>我辛苦写的内容</p>");
    const { onSuccess } = await triggerUpload(w);

    const vm = w.findComponent(WordButton).vm as unknown as { confirmReplaceImport: () => void };
    vm.confirmReplaceImport();
    await flushPromises();

    expect(importWordFile).toHaveBeenCalledTimes(1);
    expect(onSuccess).toHaveBeenCalled();
    expect(confirmState(w)).toBe(false);
  });

  it("取消则不导入，且让上传项落到失败而不是一直转圈", async () => {
    const { wrapper: w } = mountButton("<p>我辛苦写的内容</p>");
    const { onError } = await triggerUpload(w);

    const vm = w.findComponent(WordButton).vm as unknown as { cancelReplaceImport: () => void };
    vm.cancelReplaceImport();
    await flushPromises();

    expect(importWordFile).not.toHaveBeenCalled();
    expect(onError).toHaveBeenCalled();
    expect(confirmState(w)).toBe(false);
  });

  it("空文档直接导入，不弹确认", async () => {
    const { wrapper: w } = mountButton("<p></p>");
    await triggerUpload(w);

    expect(confirmState(w)).toBe(false);
    expect(importWordFile).toHaveBeenCalledTimes(1);
  });

  it("只有空白字符的文档也视为空", async () => {
    const { wrapper: w } = mountButton("<p>   </p>");
    await triggerUpload(w);

    expect(importWordFile).toHaveBeenCalledTimes(1);
  });
});
