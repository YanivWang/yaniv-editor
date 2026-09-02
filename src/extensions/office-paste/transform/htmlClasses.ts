export function transformMsoHtmlClasses(html: string): string {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  // 用类选择器而不是 [class*="MsoNormal"]：后者是子串匹配，会选中 MsoNormalTable、
  // MsoNormalIndent 这些**别的**类，而 classList.remove("MsoNormal") 按 token 精确删，
  // 对它们是空操作 —— 选择器与操作两套口径，白跑一趟。
  doc.querySelectorAll("p.MsoNormal").forEach((node) => {
    node.classList.remove("MsoNormal");
    // 类删空后留着 class="" 只是噪音，顺手清掉
    if (node.classList.length === 0) node.removeAttribute("class");
  });

  return doc.documentElement.outerHTML;
}
