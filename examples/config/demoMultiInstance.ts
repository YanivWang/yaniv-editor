export const MULTI_INSTANCE_CUSTOM_VARS_A: Record<string, string> = {
  "--ye-primary": "#6366f1",
  "--ye-bg": "#eef2ff",
  "--ye-text": "#1e1b4b",
  "--ye-border": "#c7d2fe",
};

export const MULTI_INSTANCE_CUSTOM_VARS_B: Record<string, string> = {
  "--ye-primary": "#059669",
  "--ye-bg": "#ecfdf5",
  "--ye-text": "#064e3b",
  "--ye-border": "#6ee7b7",
};

export const MULTI_INSTANCE_CONTENT_ZH = `
<h2>编辑器 A · 中文实例</h2>
<p>切换左侧「语言 / 外观 / 颜色」只应影响<strong>本栏</strong>，右侧编辑器保持独立。</p>
<p>顶栏按钮文案、占位符与 locale 绑定；根节点 <code>data-color-mode</code> 与 CSS 变量随 appearance 变化。</p>
`;

export const MULTI_INSTANCE_CONTENT_EN = `
<h2>Editor B · English instance</h2>
<p>Changing locale / appearance / color on the left should affect <strong>this column only</strong>.</p>
<p>Toolbar labels and placeholders follow scoped locale; root <code>data-color-mode</code> and CSS vars stay isolated.</p>
`;
