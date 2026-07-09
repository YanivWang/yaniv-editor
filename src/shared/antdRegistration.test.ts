import { PictureOutlined } from "@ant-design/icons-vue";
import { describe, expect, test, vi } from "vitest";
import { createApp, defineComponent, h, ref } from "vue";

import ToolbarDropdownButton from "@/components/base/ToolbarDropdownButton.vue";
import CodeBlockLanguageBadge from "@/components/editor/code-block/CodeBlockLanguageBadge.vue";
import { provideEditorRoot, provideOverlayPortal } from "@/core/editorContext";
import { OVERLAY_PORTAL_CLASS } from "@/core/overlayPortal";

function collectAntdResolveWarnings(onWarn: ReturnType<typeof vi.spyOn>) {
  return onWarn.mock.calls.filter(
    ([message]) =>
      typeof message === "string" && message.includes("Failed to resolve component: a-"),
  );
}

function mountWithEditorOverlay(vnode: ReturnType<typeof h>) {
  const root = document.createElement("div");
  root.className = "yaniv-editor";
  const portal = document.createElement("div");
  portal.className = OVERLAY_PORTAL_CLASS;
  root.append(portal);
  document.body.append(root);

  const rootRef = ref<HTMLElement | null>(root);
  const portalRef = ref<HTMLElement | null>(portal);

  const Host = defineComponent({
    setup() {
      provideEditorRoot(rootRef);
      provideOverlayPortal(portalRef);
      return () => vnode;
    },
  });

  const mountEl = document.createElement("div");
  root.append(mountEl);
  const app = createApp(Host);
  app.mount(mountEl);

  return {
    cleanup: () => {
      app.unmount();
      root.remove();
    },
  };
}

describe("antd local registration", () => {
  test("ToolbarDropdownButton mounts without unresolved a-* warnings", () => {
    const onWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { cleanup } = mountWithEditorOverlay(
      h(ToolbarDropdownButton, {
        icon: PictureOutlined,
        title: "Image",
        items: [{ key: "demo", label: "Demo" }],
      }),
    );

    expect(collectAntdResolveWarnings(onWarn)).toHaveLength(0);

    cleanup();
    onWarn.mockRestore();
  });

  test("CodeBlockLanguageBadge mounts without unresolved a-* warnings", () => {
    const onWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const { cleanup } = mountWithEditorOverlay(
      h(CodeBlockLanguageBadge, { editor: null, container: null }),
    );

    expect(collectAntdResolveWarnings(onWarn)).toHaveLength(0);

    cleanup();
    onWarn.mockRestore();
  });
});
