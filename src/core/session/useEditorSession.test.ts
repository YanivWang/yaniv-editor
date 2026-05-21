import StarterKit from "@tiptap/starter-kit";
import { describe, expect, it, vi } from "vitest";
import { computed, effectScope, nextTick, ref, type EffectScope } from "vue";

import type { BuildExtensionsCtx } from "@/capabilities/types";
import { resolveEditorProfile } from "@/core/runtime/resolveEditorProfile";
import type { BlockMenuHost } from "@/core/shell/useBlockMenuHost";
import type { TiptapLocale } from "@/locales/types";
import { zhCN } from "@/locales/zh-CN";

const buildResolvers: Array<() => void> = [];
let editorCreations = 0;

vi.mock("@tiptap/vue-3", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@tiptap/vue-3")>();
  class TrackedEditor extends actual.Editor {
    constructor(...args: ConstructorParameters<typeof actual.Editor>) {
      super(...args);
      editorCreations += 1;
    }
  }
  return { ...actual, Editor: TrackedEditor };
});

vi.mock("@/capabilities/buildExtensions", () => ({
  buildExtensions: vi.fn(
    () =>
      new Promise<
        Awaited<ReturnType<typeof import("@/capabilities/buildExtensions").buildExtensions>>
      >((resolve) => {
        buildResolvers.push(() => resolve([StarterKit]));
      }),
  ),
}));

import { useEditorSession } from "./useEditorSession";

async function flushPendingBuilds() {
  for (let round = 0; round < 8; round++) {
    const pending = [...buildResolvers];
    buildResolvers.length = 0;
    if (pending.length === 0) break;
    pending.forEach((r) => r());
    await nextTick();
  }
  await nextTick();
}

const noopHost: BlockMenuHost = {
  registerInstance: () => {},
  activate: () => {},
  openInsert: () => {},
  hide: () => {},
  updateQuery: () => {},
};

function createHarness(initialMode: "edit" | "preview" = "edit") {
  const scope: EffectScope = effectScope();
  const profile = computed(() => resolveEditorProfile({ mode: initialMode, preset: "basic" }));
  const sessionKey = ref("test|zh-CN|core|");
  const locale = ref<TiptapLocale>(zhCN);

  let session!: ReturnType<typeof useEditorSession>;

  scope.run(() => {
    session = useEditorSession({
      host: "full",
      profile,
      sessionKey: computed(() => sessionKey.value),
      locale: computed(() => locale.value),
      blockMenuHost: noopHost,
      buildCtx: () => ({
        upload: { image: () => undefined, video: () => undefined },
        galleryImages: () => [],
        officePaste: { onPasteFromOfficeWithImages: () => undefined },
        outline: { scrollParent: () => null, bindScrollParent: () => {} },
        aiConfig: () => undefined,
      }),
    });
  });

  return {
    scope,
    session,
    flush: flushPendingBuilds,
    triggerRebuild() {
      sessionKey.value = `${sessionKey.value}x`;
    },
    dispose() {
      scope.stop();
    },
  };
}

describe("useEditorSession", () => {
  it("session 未 ready 时 phase 切换被 buffer，rebuild 后回放", async () => {
    editorCreations = 0;
    buildResolvers.length = 0;

    const harness = createHarness("edit");
    harness.session.requestPhaseTransition("preview");
    expect(harness.session.editor.value).toBeNull();

    await harness.flush();

    expect(harness.session.editor.value).not.toBeNull();
    expect(harness.session.editor.value!.isEditable).toBe(false);
    harness.dispose();
  });

  it("stale buildExtensions resolve 后不创建 editor", async () => {
    editorCreations = 0;
    buildResolvers.length = 0;

    const harness = createHarness();
    harness.triggerRebuild();
    harness.triggerRebuild();
    await harness.flush();

    expect(harness.session.editor.value).not.toBeNull();
    expect(editorCreations).toBe(1);
    harness.dispose();
  });

  it("onBeforeUnmount 后 buildExtensions resolve 被 discard", async () => {
    editorCreations = 0;
    buildResolvers.length = 0;

    const harness = createHarness();
    harness.triggerRebuild();
    harness.dispose();
    await harness.flush();

    expect(harness.session.editor.value).toBeNull();
    expect(editorCreations).toBe(0);
  });
});
