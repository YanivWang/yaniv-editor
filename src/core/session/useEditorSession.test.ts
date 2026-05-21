import StarterKit from "@tiptap/starter-kit";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { computed, effectScope, nextTick, ref, type EffectScope } from "vue";

import { resolveEditorProfile } from "@/core/runtime/resolveEditorProfile";
import type { BlockMenuHost } from "@/core/shell/useBlockMenuHost";
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
  profile: ReturnType<typeof computed<ReturnType<typeof resolveEditorProfile>>>;
  sessionKey: ReturnType<typeof ref<string>>;
}

function createTestSession(initialMode: "edit" | "preview" = "edit"): TestSession {
  const scope = effectScope();
  const sessionKey = ref("session-a");
  const profile = computed(() => resolveEditorProfile({ preset: "basic", mode: initialMode }));

  let session!: ReturnType<typeof useEditorSession>;
  scope.run(() => {
    session = useEditorSession({
      host: "full",
      profile,
      sessionKey: computed(() => sessionKey.value),
      locale: computed(() => zhCN),
      blockMenuHost,
      buildCtx: () => ({}),
    });
  });

  return { scope, session, profile, sessionKey };
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
});
