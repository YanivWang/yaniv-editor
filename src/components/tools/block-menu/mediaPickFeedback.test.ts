// @vitest-environment jsdom

/**
 * 从块菜单插入媒体时，上传失败必须给用户反馈。
 *
 * `pickMediaUrl` 用 `null` 同时表示「用户取消了文件选择」和「上传失败」，
 * 调用方（`BlockPickerMenu`）只能 `if (!src) return`——两者分不开，
 * 失败就被当成取消静默掉了：用户选了文件，什么也没发生，也没有任何提示。
 * 提示因此放在最靠近失败点的地方发出（那里本来就有 `translate` 与 overlay portal）。
 */
import { afterEach, describe, expect, it } from "vitest";

import { pickMediaUrl } from "./blockMenuActions";

function createPortal(): HTMLElement {
  const portal = document.createElement("div");
  portal.className = "yaniv-editor__overlay-portal";
  document.body.append(portal);
  return portal;
}

/** 组件内部自己创建 `<input type=file>`，只能从文档里找出来驱动 */
function fileInput(): HTMLInputElement {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  if (!input) throw new Error("没有找到文件选择器");
  return input;
}

function choose(file: File | null): void {
  const input = fileInput();
  Object.defineProperty(input, "files", { value: file ? [file] : [], configurable: true });
  input.dispatchEvent(new Event("change"));
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("块菜单插入媒体时的失败反馈", () => {
  it("上传失败时给出提示，并交出 null", async () => {
    const portal = createPortal();
    const pending = pickMediaUrl(
      "image/*",
      "image",
      async () => {
        throw new Error("网络错误");
      },
      (key) => `[${key}]`,
      portal,
    );

    choose(new File(["x"], "a.png", { type: "image/png" }));

    await expect(pending).resolves.toBeNull();
    expect(portal.textContent).toContain("[messages.imageUploadFailed]");
  });

  it("宿主返回不安全地址同样算失败，按媒体种类取文案", async () => {
    const portal = createPortal();
    const pending = pickMediaUrl(
      "video/*",
      "video",
      async () => "javascript:alert(1)",
      (key) => `[${key}]`,
      portal,
    );

    choose(new File(["x"], "a.mp4", { type: "video/mp4" }));

    await expect(pending).resolves.toBeNull();
    expect(portal.textContent).toContain("[messages.videoUploadFailed]");
  });

  it("用户取消选择不是失败，不该弹提示", async () => {
    const portal = createPortal();
    const pending = pickMediaUrl(
      "image/*",
      "image",
      async () => "https://a.com/x.png",
      (key) => key,
      portal,
    );

    fileInput().dispatchEvent(new Event("cancel"));

    await expect(pending).resolves.toBeNull();
    expect(portal.textContent, "取消是正常操作，不该有任何提示").toBe("");
  });

  it("选了文件但列表为空也按取消处理", async () => {
    const portal = createPortal();
    const pending = pickMediaUrl(
      "image/*",
      "image",
      async () => "https://a.com/x.png",
      (key) => key,
      portal,
    );

    choose(null);

    await expect(pending).resolves.toBeNull();
    expect(portal.textContent).toBe("");
  });

  it("上传成功时交出地址且不提示", async () => {
    const portal = createPortal();
    const pending = pickMediaUrl(
      "image/*",
      "image",
      async () => "https://cdn.example.com/a.png",
      (key) => key,
      portal,
    );

    choose(new File(["x"], "a.png", { type: "image/png" }));

    await expect(pending).resolves.toBe("https://cdn.example.com/a.png");
    expect(portal.textContent).toBe("");
  });

  it("无论成功失败都不把 <input> 留在文档里", async () => {
    const portal = createPortal();
    const pending = pickMediaUrl(
      "image/*",
      "image",
      async () => {
        throw new Error("网络错误");
      },
      (key) => key,
      portal,
    );

    choose(new File(["x"], "a.png", { type: "image/png" }));
    await pending;

    expect(document.querySelector('input[type="file"]')).toBeNull();
  });
});
