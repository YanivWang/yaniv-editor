/**
 * 媒体节点像素尺寸的统一解析。
 *
 * `parseInt("abc")` / `parseInt("auto")` / `parseInt("")` 都是 `NaN`。NaN 一旦写进 attrs：
 * 后续缩放计算全部失效；`getJSON()` 会把它序列化成 `null`，宿主看到的值与文档实际值不一致；
 * 节点视图的 `update()` 里 `NaN !== NaN` 恒成立，每次事务都会误判为「尺寸变了」。
 *
 * **解析（parseHTML）与写回（拖拽结束）两条路径必须共用同一判定**，图片与视频两个媒体
 * 扩展也必须共用——早先只有图片解析侧做了守卫，图片写回侧与整个视频扩展都还是裸 `parseInt`。
 */
export function parseSize(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}
