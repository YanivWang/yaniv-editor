/**
 * 流式响应的按行读取器 —— 三个 adapter 共用。
 *
 * 网络分片**不保证**落在行边界或字符边界上。此前三个 adapter 各写一份
 * `decoder.decode(value)` + `chunk.split("\n")`，两处都会丢内容：
 *
 * - 一行 SSE/NDJSON 被劈成两个 chunk 时，前半段 `JSON.parse` 抛错、后半段不再带
 *   `data:` 前缀，两半都被 `catch {}` 静默吞掉 —— 整个增量凭空消失；
 * - 多字节字符（中文、emoji）被劈开时，不带 `{ stream: true }` 的 `decode()`
 *   会把半个字符解成 U+FFFD，同样让那一行 JSON 失效。
 *
 * 这里统一处理：解码器保留半个字符跨 chunk 续接，行缓冲跨 chunk 拼接，
 * 流结束时冲刷末尾那条没有换行符的残行。
 *
 * `finally` 里的 `reader.cancel()` 不是可有可无的收尾：消费方**提前退出**
 * `for await` 时（`onToken` 回调抛错是真实路径——编辑器销毁后往文档写内容会抛），
 * 底层响应流不会自己停下。实测提前退出后流的 `cancel` 回调**不被调用**，
 * 服务端仍在推、客户端仍在收——对一段长回答的 AI 流式响应，这是白烧的带宽与 API 配额。
 * 加上之后实测 break / 回调抛错两条路径都能取消底层流，而正常读完时流已 close、
 * `cancel()` 是 no-op，内容一字不少；流本身 error 时错误照常向上抛，不会被这里吞掉。
 */
export async function* readStreamLines(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<string, void, undefined> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      let newlineIndex = buffer.indexOf("\n");
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        if (line.trim()) yield line;
        newlineIndex = buffer.indexOf("\n");
      }
    }

    // 冲刷解码器内可能残留的不完整字节序列，再吐出最后一条无换行的残行
    buffer += decoder.decode();
    if (buffer.trim()) yield buffer;
  } finally {
    try {
      // 流已经 close / error 时这是 no-op
      await reader.cancel();
    } catch {
      // finally 里的收尾**绝不能**盖掉调用方正在向上抛的那个真实错误。
      // 用 try/catch 而不是 `.catch()`：后者只挡 reject，挡不住同步抛。
    }
  }
}
