import type { MenuItemConfig } from "@/configs/toolbarTypes";

export function findMenuItemByKey(
  items: MenuItemConfig[],
  key: string,
): MenuItemConfig | undefined {
  for (const item of items) {
    if (item.key === key) return item;
    if (item.children?.length) {
      const found = findMenuItemByKey(item.children, key);
      if (found) return found;
    }
  }
  return undefined;
}
