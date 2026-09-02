import { parseLetterNumber, parseRomanNumber, parseStyleAttribute } from "../utils";

const listTypeRegex = /<!--\[if \!supportLists\]-->((.|\n)*)<!--\[endif\]-->/m;

export function transformLists(html: string): string {
  if (html.indexOf("mso-list:") === -1) return html;

  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");

  const listStack: HTMLElement[] = [];
  let currentListId = "";

  const listElements = doc.querySelectorAll(`p[style*="mso-list:"]`);

  listElements.forEach((node) => {
    const el = node as HTMLElement;
    const parsed = parseMsoListAttribute(parseStyleAttribute(el)["mso-list"]);
    // Word 用 `mso-list:none` 显式声明「这段**不是**列表项」。解析不出列表 id 的段落
    // （`none`、被截断的值、非 Word 生成的 mso-list）一律原样放过：
    // 不转换、更不能 remove——下面的 el.remove() 会让它彻底消失。
    if (!parsed.id) return;
    const msoListId = parsed.id;
    const msoListLevel = parsed.level;

    if (currentListId !== msoListId && (hasNonListItemSibling(el) || msoListLevel === 1)) {
      currentListId = msoListId;
      listStack.length = 0;
    }

    while (msoListLevel > listStack.length) {
      const newList = createListElement(el);

      const parentList = listStack[listStack.length - 1];
      if (parentList) {
        parentList.appendChild(newList);
      } else {
        el.before(newList);
      }
      listStack.push(newList);
    }

    while (msoListLevel < listStack.length) {
      listStack.pop();
    }

    const last = listStack[listStack.length - 1];
    // 不变量守卫，不是当前可达分支：层级被钳制到 >= 1 后上面的 while 至少入栈一次，
    // 所以 last 恒非空。写在这里是为了让「删除原段落」与「内容已搬进列表」严格绑定 ——
    // 一旦有人放宽钳制，退化的结果是不转换，而不是段落连内容一起消失。
    if (!last) return;
    last.appendChild(getListItemFromParagraph(el));
    el.remove();
  });

  return doc.documentElement.outerHTML;
}

function hasNonListItemSibling(el: Element): boolean {
  return (
    !el.previousElementSibling ||
    !(el.previousElementSibling.nodeName === "OL" || el.previousElementSibling.nodeName === "UL")
  );
}

function getListItemFromParagraph(el: HTMLElement): HTMLLIElement {
  const li = document.createElement("li");
  li.innerHTML = el.innerHTML.replace(listTypeRegex, "");
  return li;
}

/**
 * Word 列表最深 9 级（「定义新的多级列表」对话框的上限）。
 *
 * 层级来自剪贴板 —— 不可信输入。它直接驱动 `while (level > stack.length)` 建嵌套列表，
 * 所以必须钳制：`mso-list:l0 level5000 lfo1` 会创建 5000 层嵌套 `<ul>`，
 * 序列化时 parse5 递归爆栈抛 RangeError，而 transformPastedHTML 的异常
 * 会让整次粘贴失败。
 */
const MAX_LIST_LEVEL = 9;

function parseMsoListAttribute(attr: string | undefined): { id: string; level: number } {
  const msoListValue = attr || "";
  // 值形如 `l0 level1 lfo1`；连续空白会切出空串项，交给下面的判定自然忽略
  const msoListInfos = msoListValue.split(/\s+/);
  // 必须整段匹配：未锚定的 /l[0-9]+/ 会把 `level1` 也认成列表 id（第 5 个字符起是 `l1`）
  const msoListId = msoListInfos.find((e) => /^l\d+$/.test(e)) || "";
  const levelRaw = msoListInfos.find((e) => /^level\d+$/.test(e))?.slice(5);
  const parsedLevel = levelRaw ? Number.parseInt(levelRaw, 10) : 1;
  const msoListLevel = Number.isFinite(parsedLevel)
    ? Math.min(Math.max(parsedLevel, 1), MAX_LIST_LEVEL)
    : 1;
  return { id: msoListId, level: msoListLevel };
}

function getListPrefix(el: HTMLElement): string {
  const matches = el.innerHTML.match(listTypeRegex);
  if (!matches?.length) return "";

  const p = new DOMParser();
  const d = p.parseFromString(matches[0], "text/html");
  return d.body.querySelector("span")?.textContent || "";
}

const listOrderRegex = {
  number: /[0-9]+\./,
  romanLower: /(?=[mdclxvi])m*(c[md]|d?c*)(x[cl]|l?x*)(i[xv]|v?i*)\./,
  romanUpper: /(?=[MDCLXVI])M*(C[MD]|D?C*)(X[CL]|L?X*)(I[XV]|V?I*)\./,
  letterLower: /[a-z]+\./,
  letterUpper: /[A-Z]+\./,
};

function getListInfo(prefix: string): {
  type: "ul" | "ol";
  countType: string | null;
  start: number;
} {
  let type: "ul" | "ol" = "ul";
  let countType: string | null = null;
  let start = 1;

  let m: RegExpMatchArray | null;
  if ((m = prefix.match(listOrderRegex.number))) {
    type = "ol";
    start = +m[0].replace(".", "");
  } else if ((m = prefix.match(listOrderRegex.romanLower))) {
    type = "ol";
    countType = "i";
    start = parseRomanNumber(m[0].replace(".", ""));
  } else if ((m = prefix.match(listOrderRegex.romanUpper))) {
    type = "ol";
    countType = "I";
    start = parseRomanNumber(m[0].replace(".", ""));
  } else if ((m = prefix.match(listOrderRegex.letterLower))) {
    type = "ol";
    countType = "a";
    start = parseLetterNumber(m[0].replace(".", ""));
  } else if ((m = prefix.match(listOrderRegex.letterUpper))) {
    type = "ol";
    countType = "A";
    start = parseLetterNumber(m[0].replace(".", ""));
  }

  return { type, countType, start };
}

function createListElement(el: HTMLElement): HTMLOListElement | HTMLUListElement {
  const listInfo = getListInfo(getListPrefix(el));
  const list = document.createElement(listInfo.type);

  if (listInfo.countType) {
    list.setAttribute("type", listInfo.countType);
  }

  if (listInfo.start > 1 && list.nodeName === "OL") {
    list.setAttribute("start", String(listInfo.start));
  }

  return list;
}
