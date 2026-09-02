import { describe, expect, it } from "vitest";

import { readStreamLines } from "./readStreamLines";

/** 把若干**字节块**伪装成 fetch 响应体：分片位置由调用方精确控制 */
function bodyOf(byteChunks: Uint8Array[]): ReadableStream<Uint8Array> {
  let index = 0;
  return {
    getReader: () => ({
      read: () =>
        index < byteChunks.length
          ? Promise.resolve({ done: false, value: byteChunks[index++] })
          : Promise.resolve({ done: true, value: undefined }),
      // 真实的 ReadableStreamDefaultReader 一定有 cancel；
      // `readStreamLines` 在 finally 里调它来取消提前退出时仍在下载的响应流
      cancel: () => Promise.resolve(),
    }),
  } as unknown as ReadableStream<Uint8Array>;
}

/** 在第 `at` 个**字节**处切开（可能落在一个多字节字符中间） */
function splitAt(text: string, at: number): Uint8Array[] {
  const bytes = new TextEncoder().encode(text);
  return [bytes.slice(0, at), bytes.slice(at)];
}

async function linesOf(body: ReadableStream<Uint8Array>): Promise<string[]> {
  const out: string[] = [];
  for await (const line of readStreamLines(body)) out.push(line);
  return out;
}

describe("readStreamLines", () => {
  it("一个 chunk 内的多行按序吐出", async () => {
    const chunk = new TextEncoder().encode("a\nb\nc\n");
    expect(await linesOf(bodyOf([chunk]))).toEqual(["a", "b", "c"]);
  });

  it("跨 chunk 的半行被拼回完整行", async () => {
    // "hello-world" 在第 7 字节处被劈开
    expect(await linesOf(bodyOf(splitAt("hello-world\n", 7)))).toEqual(["hello-world"]);
  });

  it("被劈开的多字节字符不会解成 U+FFFD", async () => {
    // "你好" 的第一个字符占 3 字节，在它中间切
    const lines = await linesOf(bodyOf(splitAt("你好世界\n", 1)));
    expect(lines).toEqual(["你好世界"]);
    expect(lines[0]).not.toContain("�");
  });

  it("末尾没有换行符的残行也会吐出", async () => {
    const chunk = new TextEncoder().encode("no-trailing-newline");
    expect(await linesOf(bodyOf([chunk]))).toEqual(["no-trailing-newline"]);
  });

  it("空行与纯空白行被跳过", async () => {
    const chunk = new TextEncoder().encode("a\n\n   \nb\n");
    expect(await linesOf(bodyOf([chunk]))).toEqual(["a", "b"]);
  });

  it("每个字节单独成 chunk 时仍能还原全部内容", async () => {
    const bytes = new TextEncoder().encode('data: {"k":"值"}\ndata: [DONE]\n');
    const perByte = Array.from(bytes, (b) => new Uint8Array([b]));
    expect(await linesOf(bodyOf(perByte))).toEqual(['data: {"k":"值"}', "data: [DONE]"]);
  });

  it("空流不吐出任何行", async () => {
    expect(await linesOf(bodyOf([]))).toEqual([]);
  });
});

/**
 * 消费方提前退出时，仍在下载的响应流必须被取消。
 *
 * 真实路径不是「消费方写了 break」——三个 adapter 都是完整 `for await` 到底的——
 * 而是 `onToken` 回调抛错：编辑器销毁后往文档写内容会抛（不变量 15），
 * 异常穿过 `for await` 提前结束迭代。此时若不取消底层流，服务端仍在推、
 * 客户端仍在收，一段长回答就是白烧的带宽与 API 配额。
 *
 * 这里用**真实** `ReadableStream` 而不是上面的字节桩：要观察的正是流自身的
 * `cancel` 回调有没有被调到。
 */
describe("readStreamLines 提前退出时取消底层流", () => {
  /** 造一个永远还有下一块的流，用 cancel 回调观察它是否被取消 */
  function endlessStream() {
    const encoder = new TextEncoder();
    let cancelled = false;
    let served = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        served += 1;
        controller.enqueue(encoder.encode(`line-${served}\n`));
      },
      cancel() {
        cancelled = true;
      },
    });
    return { stream, wasCancelled: () => cancelled };
  }

  it("消费方 break 后底层流被取消", async () => {
    const { stream, wasCancelled } = endlessStream();

    const seen: string[] = [];
    for await (const line of readStreamLines(stream)) {
      seen.push(line);
      if (seen.length === 2) break;
    }

    expect(seen).toEqual(["line-1", "line-2"]);
    expect(wasCancelled()).toBe(true);
  });

  it("消费方回调抛错后底层流被取消，且错误照常向上抛", async () => {
    const { stream, wasCancelled } = endlessStream();
    const boom = new Error("onToken 在编辑器销毁后抛错");

    await expect(
      (async () => {
        let n = 0;
        for await (const _line of readStreamLines(stream)) {
          n += 1;
          if (n === 2) throw boom;
        }
      })(),
    ).rejects.toBe(boom);

    expect(wasCancelled()).toBe(true);
  });

  it("流自身 error 时错误向上抛，不被收尾的 cancel 吞掉", async () => {
    const encoder = new TextEncoder();
    const failure = new Error("网络中断");
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("line-1\n"));
        controller.error(failure);
      },
    });

    await expect(
      (async () => {
        for await (const _line of readStreamLines(stream)) {
          // 读到出错为止
        }
      })(),
    ).rejects.toBe(failure);
  });

  it("正常读到底：内容一字不少，收尾的 cancel 是 no-op", async () => {
    const encoder = new TextEncoder();
    let cancelCalls = 0;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode("a\nb"));
        controller.enqueue(encoder.encode("c\n尾行无换行"));
        controller.close();
      },
      cancel() {
        cancelCalls += 1;
      },
    });

    expect(await linesOf(stream)).toEqual(["a", "bc", "尾行无换行"]);
    // 流已 close，cancel 回调不会被调到
    expect(cancelCalls).toBe(0);
  });
});
