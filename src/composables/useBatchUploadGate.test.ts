/**
 * antd 的 `<a-upload-dragger multiple>` 对每个文件各调一次 `customRequest`，
 * 且是**并发**发起——实测拖入 3 个文件时三次调用的 `enter` 全部先出现，
 * 随后才逐个 `exit`，所以「数在飞的请求数」这个判据是可靠的。
 *
 * 弹窗必须等整批结束才关：`VideoUpload` / `ImageUpload` 此前都写成「成功即
 * `open = false`」，用户看到的是弹窗自己关了，内容却还在一个一个冒出来，
 * 且再也没有取消的入口。
 *
 * 还要求至少有一个成功——全部失败时保持打开，用户才看得到错误提示、能直接重试。
 */
import { describe, expect, it } from "vitest";
import { ref } from "vue";

import { useBatchUploadGate } from "./useBatchUploadGate";

describe("useBatchUploadGate", () => {
  it("三个并发上传，只有最后一个结束时才关闭", () => {
    const open = ref(true);
    const gate = useBatchUploadGate(open);

    // antd 并发发起三次
    gate.begin();
    gate.begin();
    gate.begin();

    gate.markSuccess();
    gate.end();
    expect(open.value).toBe(true);

    gate.markSuccess();
    gate.end();
    expect(open.value).toBe(true);

    gate.markSuccess();
    gate.end();
    expect(open.value).toBe(false);
  });

  it("单个文件成功即关闭", () => {
    const open = ref(true);
    const gate = useBatchUploadGate(open);

    gate.begin();
    gate.markSuccess();
    gate.end();

    expect(open.value).toBe(false);
  });

  it("整批全部失败时弹窗保持打开，用户才看得到错误并能重试", () => {
    const open = ref(true);
    const gate = useBatchUploadGate(open);

    gate.begin();
    gate.begin();
    gate.end();
    gate.end();

    expect(open.value).toBe(true);
  });

  it("部分成功也关闭（成功的内容已经插进文档了）", () => {
    const open = ref(true);
    const gate = useBatchUploadGate(open);

    gate.begin();
    gate.begin();
    gate.end(); // 失败
    gate.markSuccess();
    gate.end();

    expect(open.value).toBe(false);
  });

  it("成功标记不跨批次残留", () => {
    const open = ref(true);
    const gate = useBatchUploadGate(open);

    // 第一批：成功并关闭
    gate.begin();
    gate.markSuccess();
    gate.end();
    expect(open.value).toBe(false);

    // 第二批：用户重新打开弹窗，这一批全失败——不能被上一批的成功带着关掉
    open.value = true;
    gate.begin();
    gate.end();
    expect(open.value).toBe(true);
  });
});
