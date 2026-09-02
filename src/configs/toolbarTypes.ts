/**
 * Toolbar Types — 工具栏与下拉菜单共用类型
 *
 * 与 `editorConstants.ts` 同一条约定：只保留有消费方的类型。
 * 曾经从常量清单推导过一批别名（`TextColor` / `FontSizeOption` / `TableBorderStyle` 等），
 * 随对应常量一起删除。
 */

import type { Component } from "vue";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeadingValue = "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type AlignValue = "left" | "center" | "right" | "justify";

export interface MenuItemConfig {
  key: string;
  type?: "divider";
  label?: string;
  icon?: Component;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean;
  active?: boolean;
  children?: MenuItemConfig[];
  /** 子菜单展示：`nested` 默认嵌套；`split-hover` 主区域点击 + 右侧 hover 语言列表 */
  submenuMode?: "nested" | "split-hover";
  /** split-hover 模式下当前选中的子项 key */
  selectedChildKey?: string;
  /** split-hover 右侧箭头 tooltip */
  splitArrowTitle?: string;
}
