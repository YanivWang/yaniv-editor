/**
 * Ant Design Vue 组件 / 静态 API 的唯一入口。
 *
 * - 组件：各 `.vue` 局部 import，宿主无需 `app.use(Antd)`。
 * - Toast：禁止使用 antd 静态 `message` / `notification`（全局单例 + body）；
 *   一律走 `showOverlayToast` / `showOverlayNotice` / `useOverlayFeedback`。
 */
export {
  Button,
  Checkbox,
  Dropdown,
  Input,
  Menu,
  MenuDivider,
  MenuItem,
  Modal,
  Popover,
  Select,
  Space,
  SubMenu,
  Switch,
  Textarea,
  Tooltip,
  UploadDragger,
} from "ant-design-vue";
