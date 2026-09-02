// @vitest-environment jsdom

/**
 * 本地上传失败必须给用户反馈。
 *
 * 两个上传弹窗都设了 `:show-upload-list="false"`，antd 把文件标成 error 用户也看不见；
 * `catch` 里原先只有 `onError?.(e)`，于是宿主的 `uploadImage` 抛错、或返回了不合
 * 媒体白名单的地址时，**弹窗照常关闭、图片没插入、界面上不出现任何提示**——
 * 用户会以为上传成功了。
 *
 * 文案 `messages.imageUploadFailed` / `videoUploadFailed` 早就在两份语言包里写好了，
 * 只是从来没有消费方（同仓库的 `WordButton` 是接上的，这两处漏了）。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { defineComponent, h, nextTick, ref } from "vue";

import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { installBrowserStubs, installLayoutStubs } from "@/testing/mountEditor";

import ImageUpload from "./image/ImageUpload.vue";
import VideoUpload from "./video/VideoUpload.vue";

import type { VueWrapper } from "@vue/test-utils";
import type { Component } from "vue";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
});

type CustomRequest = (options: {
  file: File;
  onSuccess?: (body: unknown) => void;
  onError?: (error: unknown) => void;
}) => void | Promise<void>;

let capturedRequest: CustomRequest | null = null;

/** 替掉 a-upload-dragger，把它收到的 custom-request 交出来直接驱动 */
const DraggerStub = defineComponent({
  props: { customRequest: { type: Function, default: undefined } },
  setup(props, { slots }) {
    // 渲染 slot：里面的文案是判断「语言包加载完了没有」的信号
    return () => {
      capturedRequest = props.customRequest as CustomRequest;
      return h("div", { class: "dragger-stub" }, slots.default?.());
    };
  },
});

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;
let portal: HTMLElement;
let localeReady: () => boolean = () => false;

async function mountUploader(component: Component, props: Record<string, unknown>): Promise<void> {
  const el = document.createElement("div");
  document.body.append(el);
  editor = new Editor({ element: el, extensions: [StarterKit], content: "<p>甲</p>" });

  const currentEditor = editor;
  wrapper = mount(
    defineComponent({
      setup() {
        const root = document.createElement("div");
        root.className = EDITOR_ROOT_CLASS;
        portal = document.createElement("div");
        portal.className = OVERLAY_PORTAL_CLASS;
        root.append(portal);
        document.body.append(root);

        provideEditorRoot(ref(root));
        provideOverlayPortal(ref(portal));
        const localeCtx = provideEditorLocale(ref<string | undefined>("zh-CN"));
        localeReady = () => localeCtx.messages.value !== null;
        return () => h(component, { editor: currentEditor, ...props });
      },
    }),
    {
      attachTo: document.body,
      global: {
        stubs: {
          UploadDragger: DraggerStub,
          AUploadDragger: DraggerStub,
          Modal: { template: "<div><slot /></div>" },
          AModal: { template: "<div><slot /></div>" },
        },
      },
    },
  );

  /**
   * 语言包是 `await import()` 的，一次 flush 等不到，没等够就会断言到
   * `messages.imageUploadFailed` 这样的原始 key。
   *
   * 判据直接问 locale 上下文自己：按渲染文本判（「文案里还有没有 `editor.`」）
   * 依赖被测组件恰好渲染了某条文案——`VideoUpload` 的弹窗里没有，
   * 于是那个判据一开始就满足，等于没等。
   */
  for (let attempt = 0; attempt < 80; attempt += 1) {
    await flushPromises();
    await nextTick();
    if (localeReady()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("语言包未在预期内就绪");
}

async function runUpload(file: File): Promise<unknown> {
  let reportedError: unknown = null;
  await capturedRequest!({
    file,
    onError: (error) => {
      reportedError = error;
    },
  });
  await flushPromises();
  await nextTick();
  return reportedError;
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  capturedRequest = null;
  document.body.innerHTML = "";
});

describe("本地上传失败的反馈", () => {
  it("图片：宿主的上传回调抛错时弹提示，并把错误交回 antd", async () => {
    await mountUploader(ImageUpload, {
      uploadImage: async () => {
        throw new Error("网络错误");
      },
    });

    const reportedError = await runUpload(new File(["x"], "a.png", { type: "image/png" }));

    expect(portal.textContent).toContain("图片上传失败");
    expect((reportedError as Error).message).toBe("网络错误");
    expect(editor!.getHTML(), "失败时不该插入任何图片").toBe("<p>甲</p>");
  });

  it("图片：宿主返回不安全地址也算失败", async () => {
    await mountUploader(ImageUpload, { uploadImage: async () => "javascript:alert(1)" });

    await runUpload(new File(["x"], "a.png", { type: "image/png" }));

    expect(portal.textContent).toContain("图片上传失败");
    expect(editor!.getHTML()).toBe("<p>甲</p>");
  });

  it("视频：同样要提示，文案取视频那条", async () => {
    await mountUploader(VideoUpload, {
      uploadVideo: async () => {
        throw new Error("网络错误");
      },
    });

    await runUpload(new File(["x"], "a.mp4", { type: "video/mp4" }));

    expect(portal.textContent).toContain("视频上传失败");
  });

  it("上传成功时不弹失败提示", async () => {
    await mountUploader(ImageUpload, {
      uploadImage: async () => "https://cdn.example.com/a.png",
    });

    await runUpload(new File(["x"], "a.png", { type: "image/png" }));

    expect(portal.textContent).not.toContain("图片上传失败");
  });
});
