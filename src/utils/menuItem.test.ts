/**
 * 菜单项按 key 递归查找。
 *
 * `ToolbarDropdownButton` 用它把 antd 交回来的 key 换回菜单项定义，
 * 二级菜单（split-hover 的语言列表、转换列表）都靠这一步——找不到就静默什么也不做。
 */
import { describe, expect, it } from "vitest";

import type { MenuItemConfig } from "@/configs/toolbarTypes";

import { findMenuItemByKey } from "./menuItem";

const items: MenuItemConfig[] = [
  { key: "a", label: "甲" },
  {
    key: "parent",
    label: "父项",
    children: [
      { key: "child-1", label: "子一" },
      {
        key: "child-2",
        label: "子二",
        children: [{ key: "grandchild", label: "孙" }],
      },
    ],
  },
  { key: "b", label: "乙", children: [] },
];

describe("findMenuItemByKey", () => {
  it("找得到顶层项", () => {
    expect(findMenuItemByKey(items, "a")?.label).toBe("甲");
  });

  it("找得到二级与三级子项", () => {
    expect(findMenuItemByKey(items, "child-1")?.label).toBe("子一");
    expect(findMenuItemByKey(items, "grandchild")?.label).toBe("孙");
  });

  it("有子菜单的父项自身也找得到", () => {
    expect(findMenuItemByKey(items, "parent")?.label).toBe("父项");
  });

  it("找不到时交出 undefined，不抛错", () => {
    expect(findMenuItemByKey(items, "不存在")).toBeUndefined();
    expect(findMenuItemByKey([], "a")).toBeUndefined();
  });

  it("children 是空数组不影响继续找后面的项", () => {
    expect(findMenuItemByKey(items, "b")?.label).toBe("乙");
  });

  it("同名 key 交出先出现的那个（深度优先，父在子之前）", () => {
    const duplicated: MenuItemConfig[] = [
      { key: "dup", label: "外层", children: [{ key: "dup", label: "内层" }] },
      { key: "dup", label: "后面的同级" },
    ];

    expect(findMenuItemByKey(duplicated, "dup")?.label).toBe("外层");
  });
});
