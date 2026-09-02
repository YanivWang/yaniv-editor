import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  computed,
  effectScope,
  nextTick,
  ref,
  type ComputedRef,
  type EffectScope,
  type Ref,
} from "vue";

import type { BuildExtensionsCtx } from "@/capabilities/types";
import { resolveEditorProfile } from "@/core/runtime/resolveEditorProfile";
import type { EditorRuntimeProfile } from "@/core/runtime/types";
import type { BlockMenuHost } from "@/core/shell/useBlockMenuHost";
import { enUS } from "@/locales/en-US";
import type { TiptapLocale } from "@/locales/types";
import { zhCN } from "@/locales/zh-CN";

import { useEditorSession } from "./useEditorSession";

const blockMenuHost: BlockMenuHost = {
  registerInstance: vi.fn(),
  activate: vi.fn(),
  openInsert: vi.fn(),
  hide: vi.fn(),
  updateQuery: vi.fn(),
};

const buildDeferreds: Array<() => void> = [];

vi.mock("@/capabilities/buildExtensions", () => ({
  buildExtensions: vi.fn(async () => {
    await new Promise<void>((resolve) => {
      buildDeferreds.push(resolve);
    });
    return [StarterKit];
  }),
}));

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
}

function releaseNextBuild(): void {
  const resolve = buildDeferreds.shift();
  if (!resolve) throw new Error("No pending buildExtensions call");
  resolve();
}

interface TestSession {
  scope: EffectScope;
  session: ReturnType<typeof useEditorSession>;
  profile: ComputedRef<EditorRuntimeProfile>;
  sessionKey: Ref<string>;
  /** 语言**包**（异步加载的产物），与 sessionKey 里的语言**代码**不同步 */
  localeMessages: Ref<TiptapLocale>;
}

function createTestBuildCtx(): Omit<
  BuildExtensionsCtx,
  "locale" | "gates" | "isEditable" | "blockMenuHost"
> {
  return {
    upload: {
      image: () => undefined,
      video: () => undefined,
    },
    galleryImages: () => [],
    mentionItems: () => undefined,
    officePaste: {
      onPasteFromOfficeWithImages: () => undefined,
    },
    outline: {
      scrollParent: () => null,
      bindScrollParent: () => {},
    },
    aiConfig: () => undefined,
  };
}

function createTestSession(initialMode: "edit" | "preview" = "edit"): TestSession {
  const scope = effectScope();
  const sessionKey = ref("session-a");
  const localeMessages = ref<TiptapLocale>(zhCN);
  const profile = computed(() => resolveEditorProfile({ preset: "basic", mode: initialMode }));

  let session!: ReturnType<typeof useEditorSession>;
  scope.run(() => {
    session = useEditorSession({
      host: "full",
      profile,
      sessionKey: computed(() => sessionKey.value),
      locale: computed(() => localeMessages.value),
      blockMenuHost,
      buildCtx: createTestBuildCtx,
    });
  });

  return { scope, session, profile, sessionKey, localeMessages };
}

describe("useEditorSession", () => {
  let active: TestSession | null = null;

  beforeEach(() => {
    buildDeferreds.length = 0;
    vi.clearAllMocks();
  });

  afterEach(() => {
    active?.scope.stop();
    active = null;
  });

  test("session 未 ready 时 phase 切换被 buffer，rebuild 后回放", async () => {
    active = createTestSession("edit");
    await flushMicrotasks();

    active.session.requestPhaseTransition("preview");
    expect(active.session.editor.value).toBeNull();

    releaseNextBuild();
    await flushMicrotasks();
    await nextTick();

    expect(active.session.status.value).toBe("ready");
    expect(active.session.editor.value?.isEditable).toBe(false);
  });

  test("stale buildExtensions resolve 后不创建 editor", async () => {
    active = createTestSession("edit");
    await flushMicrotasks();

    active.sessionKey.value = "session-b";
    await flushMicrotasks();

    releaseNextBuild();
    await flushMicrotasks();

    expect(active.session.editor.value).toBeNull();

    releaseNextBuild();
    await flushMicrotasks();
    await nextTick();

    expect(active.session.editor.value).not.toBeNull();
  });

  test("scope dispose 后 in-flight resolve 被 discard", async () => {
    active = createTestSession("edit");
    await flushMicrotasks();

    active.scope.stop();
    releaseNextBuild();
    await flushMicrotasks();
    await nextTick();

    expect(active.session.editor.value).toBeNull();
    expect(active.session.status.value).toBe("idle");
  });

  /**
   * 内容快照与旧实例的销毁，都必须由 `rebuild()` 自己负责到底。
   *
   * 切换语言时会连开两次 rebuild：语言**代码**是同步的（`sessionKey` 立刻变），
   * 语言**包**是异步加载的（落地后 `locale` 才变）。这个重叠曾同时打出两个洞——
   * 快照被前一次用掉清空、后一次拿不到，用户内容整份丢失；
   * 而被取代的那一次直接 `return`，把已从 `editor.value` 摘下的旧实例撂在原地不销毁。
   */
  test("locale 包落地触发的 rebuild 也保留内容", async () => {
    active = createTestSession("edit");
    await flushMicrotasks();
    releaseNextBuild();
    await flushMicrotasks();
    await nextTick();

    active.session.editor.value?.commands.setContent("<p>用户写的内容</p>");
    await nextTick();
    expect(active.session.editor.value?.getHTML()).toContain("用户写的内容");

    // 只动语言包、不动 sessionKey：这条路径的调用方从不设置快照
    active.localeMessages.value = enUS;
    await flushMicrotasks();
    releaseNextBuild();
    await flushMicrotasks();
    await nextTick();

    expect(active.session.editor.value?.getHTML()).toContain("用户写的内容");
  });

  test("被更新的一次取代时，旧编辑器仍被销毁", async () => {
    active = createTestSession("edit");
    await flushMicrotasks();
    releaseNextBuild();
    await flushMicrotasks();
    await nextTick();

    const first = active.session.editor.value;
    expect(first).not.toBeNull();
    expect(first!.isDestroyed).toBe(false);

    // 同一拍连开两次 rebuild：后一次让前一次在取消检查处 return
    active.sessionKey.value = "session-b";
    active.localeMessages.value = enUS;
    await flushMicrotasks();

    while (buildDeferreds.length > 0) {
      releaseNextBuild();
      await flushMicrotasks();
    }
    await nextTick();

    // 旧实例已从 editor.value 摘走，除了那次 rebuild 再无人持有它
    expect(active.session.editor.value).not.toBe(first);
    expect(first!.isDestroyed).toBe(true);
  });

  test("并发重建后内容不丢", async () => {
    active = createTestSession("edit");
    await flushMicrotasks();
    releaseNextBuild();
    await flushMicrotasks();
    await nextTick();

    active.session.editor.value?.commands.setContent("<p>并发前的内容</p>");
    await nextTick();

    active.sessionKey.value = "session-b";
    active.localeMessages.value = enUS;
    await flushMicrotasks();

    while (buildDeferreds.length > 0) {
      releaseNextBuild();
      await flushMicrotasks();
    }
    await nextTick();

    expect(active.session.editor.value?.getHTML()).toContain("并发前的内容");
  });
});
