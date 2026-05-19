/** 标准化颜色值（小写、去空格；空值回退 #000000） */
export function normalizeColor(color: string | undefined | null): string {
  return color?.trim().toLowerCase() || "#000000";
}
