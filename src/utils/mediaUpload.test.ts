// @vitest-environment jsdom

/**
 * 一次本地上传怎么变成可写进文档的地址。
 *
 * 两条路径的安全口径必须一致：宿主的上传服务与 `URL.createObjectURL` 一样是外部输入，
 * 都要过 `normalizeSafeMediaUrl`。不合格时**抛错**而不是静默降级——调用方需要能
 * 区分「上传失败」和「用户取消」，才谈得上给用户提示。
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveMediaUrl } from "./mediaUpload";

function createPortal(): HTMLElement {
  const portal = document.createElement("div");
  portal.className = "yaniv-editor__overlay-portal";
  document.body.append(portal);
  return portal;
}

function createFile(name = "a.png", type = "image/png"): File {
  return new File(["x"], name, { type });
}

let createdObjectUrls: string[] = [];
let originalCreateObjectURL: typeof URL.createObjectURL;

beforeEach(() => {
  createdObjectUrls = [];
  /**
   * ⚠️ 只换 `createObjectURL` 这一个方法。整体 `stubGlobal("URL", {...})` 会把
   * `URL` 构造函数一起换掉，而被测的 `normalizeSafeMediaUrl` 内部要 `new URL()`
   * ——那样每条用例都会「失败」，但失败的是桩不是代码。
   */
  originalCreateObjectURL = URL.createObjectURL.bind(URL);
  URL.createObjectURL = (file: Blob) => {
    const url = `blob:https://yaniv.local/${createdObjectUrls.length}-${(file as File).name}`;
    createdObjectUrls.push(url);
    return url;
  };
});

afterEach(() => {
  URL.createObjectURL = originalCreateObjectURL;
  document.body.innerHTML = "";
});

describe("resolveMediaUrl", () => {
  it("有 upload 回调时用它的返回值，并且不弹提示", async () => {
    const portal = createPortal();

    const url = await resolveMediaUrl({
      file: createFile(),
      kind: "image",
      upload: async () => "https://cdn.example.com/a.png",
      overlayPortal: portal,
    });

    expect(url).toBe("https://cdn.example.com/a.png");
    expect(portal.textContent).toBe("");
    expect(createdObjectUrls, "有上传服务时不该再造对象 URL").toHaveLength(0);
  });

  it("宿主返回不安全地址时抛错，不静默降级", async () => {
    const portal = createPortal();

    await expect(
      resolveMediaUrl({
        file: createFile(),
        kind: "image",
        upload: async () => "javascript:alert(1)",
        overlayPortal: portal,
      }),
    ).rejects.toThrow(/Unsafe image URL/);
  });

  it("宿主返回的 data: 必须与媒体种类匹配", async () => {
    const portal = createPortal();

    await expect(
      resolveMediaUrl({
        file: createFile("a.mp4", "video/mp4"),
        kind: "video",
        upload: async () => "data:image/png;base64,iVBORw0KGgo=",
        overlayPortal: portal,
      }),
    ).rejects.toThrow(/Unsafe video URL/);

    await expect(
      resolveMediaUrl({
        file: createFile("a.mp4", "video/mp4"),
        kind: "video",
        upload: async () => "data:video/mp4;base64,AAAA",
        overlayPortal: portal,
      }),
    ).resolves.toBe("data:video/mp4;base64,AAAA");
  });

  it("上传回调自己抛错时原样冒泡给调用方", async () => {
    const portal = createPortal();

    await expect(
      resolveMediaUrl({
        file: createFile(),
        kind: "image",
        upload: async () => {
          throw new Error("网络错误");
        },
        overlayPortal: portal,
      }),
    ).rejects.toThrow("网络错误");
  });

  it("没有 upload 回调时回退成 blob: 对象 URL，并提示宿主未配置", async () => {
    const portal = createPortal();

    const url = await resolveMediaUrl({
      file: createFile(),
      kind: "image",
      translate: (key) => `[${key}]`,
      overlayPortal: portal,
    });

    expect(url).toMatch(/^blob:/);
    expect(createdObjectUrls).toHaveLength(1);
    expect(portal.textContent).toContain("[messages.imageUploadNotConfigured]");
  });

  it("提示按媒体种类分别取文案", async () => {
    const portal = createPortal();

    await resolveMediaUrl({
      file: createFile("a.mp4", "video/mp4"),
      kind: "video",
      translate: (key) => `[${key}]`,
      overlayPortal: portal,
    });

    expect(portal.textContent).toContain("[messages.videoUploadNotConfigured]");
  });

  it("宿主没传 translate 时退化成 key，不会渲染出 undefined", async () => {
    const portal = createPortal();

    await resolveMediaUrl({
      file: createFile(),
      kind: "image",
      overlayPortal: portal,
    });

    expect(portal.textContent).toContain("messages.imageUploadNotConfigured");
    expect(portal.textContent).not.toContain("undefined");
  });
});
