/**
 * Toolbar Types — 工具栏与下拉菜单共用类型
 */

import {
  BACKGROUND_COLORS,
  CODE_LANGUAGES,
  FONT_FAMILIES,
  FONT_SIZES,
  LINE_HEIGHTS,
  TABLE_BORDER_STYLES,
  TEXT_COLORS,
} from "./editorConstants";

import type { Component } from "vue";

export type TextFormatType = "bold" | "italic" | "underline" | "strike" | "code";

export type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export type HeadingValue = "paragraph" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

export type ListType = "bulletList" | "orderedList" | "taskList";

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
}

export interface MenuGroupConfig {
  title: string;
  items: MenuItemConfig[];
}

export type TextColor = (typeof TEXT_COLORS)[number];
export type BackgroundColor = (typeof BACKGROUND_COLORS)[number];
export type FontFamily = (typeof FONT_FAMILIES)[number]["value"];
export type FontSizeOption = (typeof FONT_SIZES)[number]["value"];
export type LineHeightOption = (typeof LINE_HEIGHTS)[number]["value"];
export type CodeLanguage = (typeof CODE_LANGUAGES)[number];
export type TableBorderStyle = (typeof TABLE_BORDER_STYLES)[number]["value"];
