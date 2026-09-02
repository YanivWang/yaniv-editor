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
