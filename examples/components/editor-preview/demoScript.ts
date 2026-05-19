import type { DemoStep } from "./types";

export const demoScript: DemoStep[] = [
  { action: "format", format: "h1" },
  { action: "addLine", line: { html: "", class: "line-h1", tag: "h1" } },
  { action: "type", text: "Yaniv Editor", lineIndex: 0, duration: 70 },
  { action: "pause", duration: 300 },
  { action: "format", format: "" },

  { action: "addLine", line: { html: "", class: "line-subtitle", tag: "p" } },
  {
    action: "type",
    text: "Production-ready rich text editor for Vue 3",
    lineIndex: 1,
    duration: 35,
  },
  { action: "pause", duration: 400 },

  { action: "format", format: "h2" },
  { action: "addLine", line: { html: "", class: "line-h2", tag: "h2" } },
  { action: "type", text: "Features", lineIndex: 2, duration: 55 },
  { action: "pause", duration: 200 },
  { action: "format", format: "list" },

  { action: "addLine", line: { html: "", class: "line-bullet", tag: "div" } },
  { action: "format", format: "bold" },
  {
    action: "type",
    text: "<strong>5 beautiful themes</strong> with dark mode support",
    lineIndex: 3,
    duration: 28,
  },
  { action: "format", format: "list" },
  { action: "pause", duration: 100 },

  { action: "addLine", line: { html: "", class: "line-bullet", tag: "div" } },
  { action: "format", format: "italic" },
  {
    action: "type",
    text: "<em>AI-powered</em> writing: continue, polish, translate, summarize",
    lineIndex: 4,
    duration: 25,
  },
  { action: "format", format: "list" },
  { action: "pause", duration: 100 },

  { action: "format", format: "quote" },
  { action: "addLine", line: { html: "", class: "line-blockquote", tag: "blockquote" } },
  {
    action: "type",
    text: '"The best open-source editor UI kit for Vue 3."',
    lineIndex: 6,
    duration: 28,
  },
  { action: "format", format: "" },
  { action: "pause", duration: 400 },

  { action: "format", format: "code" },
  { action: "addLine", line: { html: "", class: "line-code", tag: "pre" } },
  {
    action: "type",
    text: '<span class="code-kw">import</span> { YanivEditor } <span class="code-kw">from</span> <span class="code-str">\'@yanivjs/yaniv-editor\'</span>',
    lineIndex: 7,
    duration: 25,
  },
  { action: "format", format: "" },
  { action: "pause", duration: 300 },

  { action: "format", format: "ai" },
  { action: "addLine", line: { html: "", class: "line-ai", tag: "div" } },
  {
    action: "type",
    text: '<span class="ai-tag">AI</span> Generated summary: This editor kit offers enterprise-grade features...',
    lineIndex: 8,
    duration: 22,
  },
  { action: "format", format: "" },
  { action: "pause", duration: 2000 },

  { action: "clear" },
  { action: "pause", duration: 600 },
];

export const mobileLabels = [
  { text: "5 Themes", color: "#0ea5e9" },
  { text: "AI Powered", color: "#38bdf8" },
  { text: "Word", color: "#06b6d4" },
];
