# Z-Index 与浮层挂载

编辑器所有**全局浮层**（bubble menu、BlockPicker、mention 建议、AI popover、Ant Design Dropdown / Select / Popover / Modal / Tooltip 等）统一挂载在 `EditorShell` 根节点内的 **overlay portal**（`.yaniv-editor__overlay-portal`），**禁止**挂到 `document.body`。这样浮层始终在 `.yaniv-editor` 作用域内，能正确继承 `--ye-z-*` CSS token。

例外（非视觉浮层）：

- HTML5 拖拽预览节点（`setDragImage`）
- 隐藏的 `<input type="file">`

## 宿主配置

`YanivEditor` 与 `YanivInlineEditor` 均支持 `zIndexBase` prop（默认 `1000`）。Shell 会将其写入编辑器根节点的 `--ye-z-base`：

```vue
<YanivEditor :z-index-base="1500" />
<YanivInlineEditor v-model:content="html" :z-index-base="1500" />
```

该 prop **不触发 session 重建**。

### 何时需要调整

| 场景                                              | 建议                                                             |
| ------------------------------------------------- | ---------------------------------------------------------------- |
| 编辑器为主内容，用户正常编辑                      | 保持默认 `1000`                                                  |
| 宿主有 fixed header / sidebar（z-index ~100–500） | 默认即可                                                         |
| 宿主全局 Modal / Drawer 需盖住编辑器浮层          | 宿主弹层 z-index > **1100**（见下表），或降低编辑器 `zIndexBase` |
| 编辑器嵌在宿主 Modal 内                           | 提高 `zIndexBase`，或确保宿主 Modal 层级高于编辑器               |

要完全盖住编辑器**所有**浮层（含编辑器内 Modal），宿主 UI 需高于 `zIndexBase + 100`（默认 **1100**）。

## Token 层级（`variables.css`）

颜色等 token 定义在 `:root`；**z-index token 仅定义在 `.yaniv-editor`**：

| Token                     | 计算（默认 base=1000） | 用途                             |
| ------------------------- | ---------------------- | -------------------------------- |
| `--ye-z-content`          | `1`                    | 文档内基础层                     |
| `--ye-z-content-overlay`  | `2`                    | 表格选区等                       |
| `--ye-z-content-control`  | `10`                   | 图片列宽手柄等                   |
| `--ye-z-editor-ui`        | `20`                   | 拖拽手柄                         |
| `--ye-z-editor-rail`      | `30`                   | 大纲栏                           |
| `--ye-z-chrome`           | `40`                   | 顶栏 / 底栏                      |
| `--ye-z-tooltip`          | `50`                   | 工具栏 tooltip                   |
| `--ye-z-overlay-backdrop` | `base`                 | 块选择器遮罩                     |
| `--ye-z-bubble-menu`      | `base + 10`            | 链接 / 图片 / 表格 bubble        |
| `--ye-z-floating-menu`    | `base + 20`            | 选中文本浮动菜单                 |
| `--ye-z-picker-menu`      | `base + 30`            | BlockPicker、mention、AI popover |
| `--ye-z-drag-menu`        | `base + 40`            | 拖拽块菜单                       |
| `--ye-z-drag-submenu`     | `base + 41`            | 拖拽子菜单                       |
| `--ye-z-dropdown`         | `base + 50`            | Ant Design 下拉                  |
| `--ye-z-modal`            | `base + 100`           | 编辑器内 Modal                   |

浮层相对顺序：`modal > dropdown > drag-menu > picker-menu > floating-menu > bubble-menu > backdrop`。

## 实现要点（自定义 Shell）

若自建 Shell 而非使用 `EditorShell`，须保证：

1. 根节点带 `yaniv-editor` class；
2. 根内包含 `.yaniv-editor__overlay-portal`（见 `src/styles/overlay-portal.css`）；
3. 调用 `provideEditorRoot` / `provideOverlayPortal`（`src/core/editorContext.ts`）；
4. 所有 teleport / BubbleMenu `appendTo` / Ant Design `getPopupContainer` / `getContainer` 指向 overlay portal；
5. JS 侧通过 `getYeZIndex(token, root)` 或组件内 `useYeZIndex(token)` 读取 token（`src/utils/zIndex.ts`），**必须**传入编辑器根节点，无全局 fallback。

库内统一入口：

- `useOverlayMountTarget()` — Ant Design `getPopupContainer` / Modal `getContainer`
- `useOverlayBubbleMenu()` — Tiptap 3 BubbleMenu（Floating UI）的 `appendTo` + `options`

均位于 `src/composables/useOverlayMount.ts`。

## 相关

- [集成 Props](./integration-props.md)
- [上下文 UI](../features/contextual-ui.md)
- [项目结构 — CSS 分层](../contributing/project-structure.md)
