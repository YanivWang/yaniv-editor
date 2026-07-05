import { PictureOutlined } from "@ant-design/icons-vue";
import { describe, expect, test, vi } from "vitest";
import { createApp, h } from "vue";

import ToolbarDropdownButton from "@/components/base/ToolbarDropdownButton.vue";
import CodeBlockLanguageBadge from "@/components/editor/code-block/CodeBlockLanguageBadge.vue";

function collectAntdResolveWarnings(onWarn: ReturnType<typeof vi.spyOn>) {
  return onWarn.mock.calls.filter(
    ([message]) =>
      typeof message === "string" && message.includes("Failed to resolve component: a-"),
  );
}

describe("antd local registration", () => {
  test("ToolbarDropdownButton mounts without unresolved a-* warnings", () => {
    const onWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const app = createApp({
      render: () =>
        h(ToolbarDropdownButton, {
          icon: PictureOutlined,
          title: "Image",
          items: [{ key: "demo", label: "Demo" }],
        }),
    });

    const el = document.createElement("div");
    app.mount(el);

    expect(collectAntdResolveWarnings(onWarn)).toHaveLength(0);

    app.unmount();
    onWarn.mockRestore();
  });

  test("CodeBlockLanguageBadge mounts without unresolved a-* warnings", () => {
    const onWarn = vi.spyOn(console, "warn").mockImplementation(() => {});

    const app = createApp({
      render: () => h(CodeBlockLanguageBadge, { editor: null, container: null }),
    });

    const el = document.createElement("div");
    app.mount(el);

    expect(collectAntdResolveWarnings(onWarn)).toHaveLength(0);

    app.unmount();
    onWarn.mockRestore();
  });
});
