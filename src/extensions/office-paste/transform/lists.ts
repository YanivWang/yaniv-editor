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
    if (last) last.appendChild(getListItemFromParagraph(el));
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

function parseMsoListAttribute(attr: string | undefined): { id: string; level: number } {
  const msoListValue = attr || "";
  const msoListInfos = msoListValue.split(" ");
  const msoListId = msoListInfos.find((e) => /l[0-9]+/.test(e)) || "";
  const levelRaw = msoListInfos.find((e) => e.startsWith("level"))?.substring(5);
  const msoListLevel = +(levelRaw || 1);
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
