export interface ContentLine {
  id: number;
  html: string;
  class?: string;
  tag?: string;
}

export interface DemoStep {
  action: "type" | "addLine" | "pause" | "clear" | "format";
  line?: Omit<ContentLine, "id">;
  text?: string;
  lineIndex?: number;
  duration?: number;
  format?: string;
}

export interface MobileLabel {
  text: string;
  color: string;
}
