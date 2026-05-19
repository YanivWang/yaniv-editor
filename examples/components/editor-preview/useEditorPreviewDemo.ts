import { ref, onMounted, onBeforeUnmount } from "vue";

import { demoScript } from "./demoScript";

import type { ContentLine } from "./types";

function parseHtmlChars(html: string): string[] {
  const chunks: string[] = [];
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      if (end !== -1) {
        chunks.push(html.substring(i, end + 1));
        i = end + 1;
      } else {
        chunks.push(html[i]);
        i++;
      }
    } else if (html[i] === "&") {
      const end = html.indexOf(";", i);
      if (end !== -1 && end - i < 10) {
        chunks.push(html.substring(i, end + 1));
        i = end + 1;
      } else {
        chunks.push(html[i]);
        i++;
      }
    } else {
      chunks.push(html[i]);
      i++;
    }
  }
  return chunks;
}

export function useEditorPreviewDemo() {
  const visibleLines = ref<ContentLine[]>([]);
  const isTyping = ref(false);
  const activeFormat = ref("");
  const entered = ref(false);

  let lineIdCounter = 0;
  let animationTimer: ReturnType<typeof setTimeout> | null = null;
  let aborted = false;

  function delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      animationTimer = setTimeout(resolve, ms);
    });
  }

  async function typeTextInLine(lineIndex: number, fullHtml: string, speed: number) {
    isTyping.value = true;
    const chars = parseHtmlChars(fullHtml);
    let current = "";

    for (let i = 0; i < chars.length; i++) {
      if (aborted) return;
      current += chars[i];
      if (visibleLines.value[lineIndex]) {
        visibleLines.value[lineIndex].html = current;
      }
      if (!chars[i].startsWith("<")) {
        await delay(speed);
      }
    }
    isTyping.value = false;
  }

  async function runDemo() {
    while (!aborted) {
      lineIdCounter = 0;
      for (const step of demoScript) {
        if (aborted) return;

        switch (step.action) {
          case "addLine":
            if (step.line) {
              visibleLines.value.push({ ...step.line, id: lineIdCounter++ });
            }
            break;

          case "type":
            if (step.text !== undefined && step.lineIndex !== undefined) {
              await typeTextInLine(step.lineIndex, step.text, step.duration || 40);
            }
            break;

          case "pause":
            isTyping.value = false;
            await delay(step.duration || 300);
            break;

          case "format":
            activeFormat.value = step.format || "";
            break;

          case "clear":
            visibleLines.value = [];
            activeFormat.value = "";
            break;
        }
      }
    }
  }

  onMounted(() => {
    requestAnimationFrame(() => {
      entered.value = true;
    });
    animationTimer = setTimeout(() => {
      runDemo();
    }, 800);
  });

  onBeforeUnmount(() => {
    aborted = true;
    if (animationTimer) {
      clearTimeout(animationTimer);
    }
  });

  return {
    visibleLines,
    isTyping,
    activeFormat,
    entered,
  };
}
