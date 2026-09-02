// @vitest-environment jsdom

/**
 * 视频气泡菜单：命中哪个视频、预览的开合、删除。
 *
 * 「当前是哪个视频」有三条判定路径（NodeSelection / 光标后 / 光标前），
 * 删除用的位置就从这里来——判错一条就会删掉别的节点。
 */
import StarterKit from "@tiptap/starter-kit";
import { Editor } from "@tiptap/vue-3";
import { mount } from "@vue/test-utils";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { defineComponent, h, nextTick, ref, shallowRef } from "vue";

import { provideEditorRoot, provideOverlayPortal, provideYanivEditor } from "@/core/editorContext";
import { provideEditorLocale } from "@/core/infra/useEditorLocale";
import { EDITOR_ROOT_CLASS, OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";
import { Video } from "@/extensions/video";
import {
  installBrowserStubs,
  installLayoutStubs,
  waitForLocaleMessages,
} from "@/testing/mountEditor";

import VideoToolbar from "./VideoToolbar.vue";

import type { VueWrapper } from "@vue/test-utils";

beforeAll(() => {
  installBrowserStubs();
  installLayoutStubs();
  // jsdom 没实现媒体播放，pause() 会打 "Not implemented" 噪音
  HTMLMediaElement.prototype.pause = vi.fn();
});

let editor: Editor | null = null;
let wrapper: VueWrapper | null = null;

async function mountToolbar(content: string): Promise<Editor> {
  const host = document.createElement("div");
  document.body.append(host);
  editor = new Editor({
    element: host,
    extensions: [StarterKit, Video],
    content,
  });

  const editorRef = shallowRef<Editor | null>(editor);
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
      provideYanivEditor(editorRef);
      localeCtx = provideEditorLocale(ref<string | undefined>("zh-CN"));
      return () => h(VideoToolbar);
    },
  });

  wrapper = mount(Host, {
    attachTo: document.body,
    global: { stubs: { BubbleMenu: { template: "<div><slot /></div>" } } },
  });
  await waitForLocaleMessages(localeCtx!);
  return editor;
}

function menuButton(title: string): HTMLButtonElement {
  const found = [...document.querySelectorAll<HTMLButtonElement>(".video-menu-btn")].find(
    (button) => button.getAttribute("title") === title,
  );
  if (!found) throw new Error(`没有找到「${title}」按钮`);
  return found;
}

function previewSrc(): string | null {
  return document.querySelector<HTMLVideoElement>(".ant-modal video")?.getAttribute("src") ?? null;
}

/** antd 的弹窗要经 Portal + 过渡才渲染出内容，一两个 tick 等不到 */
async function waitFor(predicate: () => boolean, what: string): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await nextTick();
    if (predicate()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`${what} 未在预期内出现`);
}

/** 光标落在视频节点之后 */
function putCursorAfterVideo(target: Editor, pos: number): void {
  target.commands.setTextSelection(pos);
}

afterEach(() => {
  wrapper?.unmount();
  wrapper = null;
  editor?.destroy();
  editor = null;
  document.body.innerHTML = "";
});

/**
 * `Video` 的 parseHTML 认的是 `video[src]`。写成别的标签根本解析不出节点，
 * 而 `not.toContain("video")` 这类断言在空文档上恒真——前置的 `expectHasVideo`
 * 就是为了把这种情况揪出来（第一版正是这么写错的）。
 */
const withVideo = '<p>前</p><video src="https://cdn.example.com/a.mp4"></video><p>后</p>';

/** 前置：确认文档里真的有视频节点，否则后面的「删掉了」全是恒真 */
function expectHasVideo(target: Editor): void {
  expect(target.getHTML(), "测试文档里应当解析出 video 节点").toContain("<video");
}

describe("预览", () => {
  it("选中视频后预览弹窗带上它的地址", async () => {
    const target = await mountToolbar(withVideo);
    expectHasVideo(target);
    target.commands.setNodeSelection(3);

    menuButton("预览").click();
    await waitFor(() => previewSrc() !== null, "预览弹窗");

    expect(previewSrc()).toBe("https://cdn.example.com/a.mp4");
  });

  it("没选中视频时点预览：弹窗根本不开", async () => {
    const target = await mountToolbar(withVideo);
    target.commands.setTextSelection(1);

    menuButton("预览").click();
    await nextTick();
    await nextTick();
    await new Promise((resolve) => setTimeout(resolve, 20));

    /**
     * 只断言 `previewSrc()` 为 null 不够：弹窗里的 `<video>` 有 `v-if="currentVideoSrc"`，
     * 「弹窗开着但地址为空」同样拿不到元素——那样的断言分不出「没开」和「开了但空」。
     */
    expect(document.querySelector(".ant-modal-wrap"), "弹窗不该被打开").toBeNull();
    expect(previewSrc()).toBeNull();
  });

  it("关闭预览会暂停播放并回到起点", async () => {
    const target = await mountToolbar(withVideo);
    target.commands.setNodeSelection(3);
    menuButton("预览").click();
    await waitFor(() => previewSrc() !== null, "预览弹窗");

    const video = document.querySelector<HTMLVideoElement>(".ant-modal video")!;
    const pause = vi.spyOn(video, "pause");
    video.currentTime = 12;

    const close = document.querySelector<HTMLElement>(".ant-modal-close")!;
    close.click();
    await nextTick();

    expect(pause).toHaveBeenCalled();
    expect(video.currentTime).toBe(0);
  });
});

describe("删除", () => {
  it("删掉被选中的那个视频，前后段落留着", async () => {
    const target = await mountToolbar(withVideo);
    expectHasVideo(target);
    target.commands.setNodeSelection(3);

    menuButton("删除视频").click();
    await nextTick();

    expect(target.getHTML()).not.toContain("video");
    expect(target.getHTML()).toContain("前");
    expect(target.getHTML()).toContain("后");
  });

  it("光标停在视频之前时也认得出它", async () => {
    const target = await mountToolbar(withVideo);
    expectHasVideo(target);
    putCursorAfterVideo(target, 3);

    menuButton("删除视频").click();
    await nextTick();

    expect(target.getHTML()).not.toContain("video");
  });

  it("光标停在视频之后时认的是前一个节点", async () => {
    const target = await mountToolbar(withVideo);
    expectHasVideo(target);
    // 视频占 pos 3~4，之后的位置
    putCursorAfterVideo(target, 4);

    menuButton("删除视频").click();
    await nextTick();

    expect(target.getHTML()).not.toContain("video");
    expect(target.getHTML()).toContain("前");
  });

  /**
   * ⚠️ 源码里 `if (!node || pos === null) return` 的前半是冗余的：`node` 与 `pos`
   * 由同一个函数同时给出，两者恒同真同假。变异只去掉 `!node` 时用例不转红，
   * 确认是双保险而非可达逻辑——如实记在这里，不为了「覆盖」它去凑测试。
   */
  it("附近没有视频时什么也不删", async () => {
    const target = await mountToolbar("<p>只有文字</p>");
    target.commands.setTextSelection(2);
    const before = target.getHTML();

    menuButton("删除视频").click();
    await nextTick();

    expect(target.getHTML()).toBe(before);
  });
});
