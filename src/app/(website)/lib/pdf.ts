// Reads basic facts and text from a PDF directly in the browser (no upload).
// Handles PDFs exported from Word, Google Docs and LibreOffice: compressed streams,
// object streams and font maps (ToUnicode). Scanned PDFs have no text to extract.

import { inflate } from "./zip";

export type PdfInfo = {
  version: string;
  pages: number;
  encrypted: boolean;
  hasFonts: boolean;
  images: number;
  title: string;
  author: string;
  creator: string;
  links: string[];
  text: string;
  words: number;
};

type PdfObject = { dict: string; data: string | null };
type CMap = { codeLength: number; map: Map<number, string> };

const latin1 = (b: Uint8Array) => new TextDecoder("latin1").decode(b);

/* ---------------------------- String decoding ----------------------------- */

function decodeLiteral(s: string) {
  return s.replace(/\\([nrtbf()\\]|[0-7]{1,3}|\r?\n)/g, (_, c: string) => {
    if (/^[0-7]+$/.test(c)) return String.fromCharCode(parseInt(c, 8) & 255);
    const map: Record<string, string> = { n: "\n", r: "\r", t: "\t", b: "", f: "", "(": "(", ")": ")", "\\": "\\" };
    return map[c] ?? "";
  });
}

function hexBytes(hex: string): number[] {
  const clean = hex.replace(/[^0-9A-Fa-f]/g, "");
  const out: number[] = [];
  for (let i = 0; i < clean.length; i += 2) out.push(parseInt(clean.slice(i, i + 2).padEnd(2, "0"), 16));
  return out;
}

function utf16be(bytes: number[]) {
  let out = "";
  for (let i = 0; i + 1 < bytes.length; i += 2) out += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
  return out;
}

// Metadata text: either PDFDocEncoding or UTF-16 starting with FE FF.
function textString(bytes: number[]) {
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return utf16be(bytes.slice(2));
  return String.fromCharCode(...bytes);
}

function metaField(dicts: string[], key: string) {
  const re = new RegExp(`/${key}\\s*(?:\\(((?:\\\\.|[^\\\\)])*)\\)|<([0-9A-Fa-f\\s]+)>)`);
  for (const d of dicts) {
    const m = d.match(re);
    if (m) {
      const bytes = m[1] !== undefined ? Array.from(decodeLiteral(m[1]), (c) => c.charCodeAt(0)) : hexBytes(m[2]);
      return textString(bytes).replace(/\0/g, "").trim();
    }
  }
  return "";
}

/* ------------------------------ Stream filters ---------------------------- */

function ascii85(data: Uint8Array): Uint8Array {
  const text = latin1(data).replace(/\s/g, "").replace(/^<~/, "").replace(/~>.*$/, "");
  const out: number[] = [];
  let group: number[] = [];
  const flush = (g: number[], keep: number) => {
    const n = g.reduce((acc, d) => acc * 85 + d, 0);
    out.push(...[(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255].slice(0, keep));
  };
  for (const ch of text) {
    if (ch === "z" && group.length === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    group.push(ch.charCodeAt(0) - 33);
    if (group.length === 5) {
      flush(group, 4);
      group = [];
    }
  }
  if (group.length > 1) {
    const size = group.length;
    while (group.length < 5) group.push(84);
    flush(group, size - 1);
  }
  return new Uint8Array(out);
}

// Applies the stream filters in order. Returns null for filters we cannot read (images etc.).
async function applyFilters(data: Uint8Array, filters: string[]): Promise<Uint8Array | null> {
  let out = data;
  for (const f of filters) {
    if (f === "FlateDecode" || f === "Fl") out = await inflate(out, "deflate");
    else if (f === "ASCII85Decode" || f === "A85") out = ascii85(out);
    else if (f === "ASCIIHexDecode" || f === "AHx") out = new Uint8Array(hexBytes(latin1(out).replace(/>.*$/, "")));
    else return null;
  }
  return out;
}

/* -------------------------------- Objects --------------------------------- */

const SKIP_DATA = /\/Subtype\s*\/Image|\/Length[123]\b|\/Subtype\s*\/(Type1C|CIDFontType0C|OpenType)|\/Type\s*\/(XRef|Metadata|EmbeddedFile)/;

async function readObjects(raw: string, bytes: Uint8Array): Promise<Map<number, PdfObject>> {
  const objects = new Map<number, PdfObject>();
  const header = /(\d+)\s+\d+\s+obj\b/g;
  let m: RegExpExecArray | null;
  while ((m = header.exec(raw))) {
    const num = Number(m[1]);
    const from = m.index + m[0].length;
    let endobj = raw.indexOf("endobj", from);
    if (endobj < 0) break;
    const streamAt = raw.slice(from, endobj).search(/stream\r?\n/);
    let dict = raw.slice(from, endobj);
    let data: string | null = null;

    if (streamAt >= 0) {
      const keyword = raw.slice(from + streamAt).match(/^stream\r?\n/)![0];
      const start = from + streamAt + keyword.length;
      const endstream = raw.indexOf("endstream", start);
      if (endstream < 0) break;
      endobj = raw.indexOf("endobj", endstream);
      if (endobj < 0) endobj = endstream;
      dict = raw.slice(from, from + streamAt);
      if (!SKIP_DATA.test(dict)) {
        let stop = endstream;
        while (stop > start && (bytes[stop - 1] === 0x0a || bytes[stop - 1] === 0x0d)) stop--;
        const filterText = dict.match(/\/Filter\s*(\[[^\]]*\]|\/\w+)/)?.[1] ?? "";
        const filters = filterText.match(/\/\w+/g)?.map((f) => f.slice(1)) ?? [];
        try {
          const out = await applyFilters(bytes.subarray(start, stop), filters);
          if (out) data = latin1(out);
        } catch {
          // damaged or unsupported stream: skip
        }
      }
    }
    objects.set(num, { dict, data });
    header.lastIndex = endobj;
  }

  // Object streams hold many small objects packed together (common in newer PDFs).
  for (const obj of Array.from(objects.values())) {
    if (!obj.data || !/\/Type\s*\/ObjStm/.test(obj.dict)) continue;
    const first = Number(obj.dict.match(/\/First\s+(\d+)/)?.[1] ?? 0);
    const nums = obj.data.slice(0, first).trim().split(/\s+/).map(Number);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const start = first + nums[i + 1];
      const end = i + 3 < nums.length ? first + nums[i + 3] : obj.data.length;
      if (!objects.has(nums[i])) objects.set(nums[i], { dict: obj.data.slice(start, end), data: null });
    }
  }
  return objects;
}

/* ------------------------------- Font maps -------------------------------- */

function parseCMap(text: string): CMap {
  const map = new Map<number, string>();
  const space = text.match(/begincodespacerange\s*<([0-9A-Fa-f]+)>/);
  let codeLength = space ? Math.ceil(space[1].length / 2) : 0;
  const code = (hex: string) => parseInt(hex, 16);

  for (const block of text.match(/beginbfchar([\s\S]*?)endbfchar/g) ?? []) {
    for (const [, src, dst] of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) {
      if (!codeLength) codeLength = Math.ceil(src.length / 2);
      map.set(code(src), utf16be(hexBytes(dst)));
    }
  }
  for (const block of text.match(/beginbfrange([\s\S]*?)endbfrange/g) ?? []) {
    for (const [, lo, hi, dst, list] of block.matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(?:<([0-9A-Fa-f]*)>|\[([^\]]*)\])/g)) {
      if (!codeLength) codeLength = Math.ceil(lo.length / 2);
      const start = code(lo);
      const end = Math.min(code(hi), start + 65535);
      if (list !== undefined) {
        const items = [...list.matchAll(/<([0-9A-Fa-f]*)>/g)].map((x) => utf16be(hexBytes(x[1])));
        items.forEach((s, i) => map.set(start + i, s));
      } else {
        const base = hexBytes(dst ?? "");
        for (let c = start; c <= end; c++) {
          const b = [...base];
          b[b.length - 1] = (b[b.length - 1] ?? 0) + (c - start); // last byte counts up
          map.set(c, utf16be(b));
        }
      }
    }
  }
  return { codeLength: codeLength || 1, map };
}

// Font resource name (e.g. "F1") -> its ToUnicode map.
function fontMaps(objects: Map<number, PdfObject>) {
  const byObject = new Map<number, CMap>();
  objects.forEach((obj, num) => {
    const ref = obj.dict.match(/\/ToUnicode\s+(\d+)\s+\d+\s+R/);
    const cmap = ref ? objects.get(Number(ref[1]))?.data : null;
    if (cmap) byObject.set(num, parseCMap(cmap));
  });

  const byName = new Map<string, CMap>();
  const addPairs = (text: string) => {
    for (const [, name, num] of text.matchAll(/\/([^\s/<>[\]()]+)\s+(\d+)\s+\d+\s+R/g)) {
      const cmap = byObject.get(Number(num));
      if (cmap) byName.set(name, cmap);
    }
  };
  objects.forEach((obj) => {
    for (const [, inner] of obj.dict.matchAll(/\/Font\s*<<([\s\S]*?)>>/g)) addPairs(inner);
    for (const [, num] of obj.dict.matchAll(/\/Font\s+(\d+)\s+\d+\s+R/g)) addPairs(objects.get(Number(num))?.dict ?? "");
  });
  return byName;
}

/* ----------------------------- Text extraction ---------------------------- */

function decodeBytes(bytes: number[], cmap: CMap | undefined) {
  if (!cmap) return String.fromCharCode(...bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i += cmap.codeLength) {
    let c = 0;
    for (let k = 0; k < cmap.codeLength; k++) c = (c << 8) | (bytes[i + k] ?? 0);
    out += cmap.map.get(c) ?? "";
  }
  return out;
}

const literalBytes = (s: string) => Array.from(decodeLiteral(s), (c) => c.charCodeAt(0));

function textFromContent(content: string, fonts: Map<string, CMap>) {
  let out = "";
  let font: CMap | undefined;
  const ops =
    /\/([^\s/<>[\]()]+)\s+-?[\d.]+\s+Tf|\[((?:\\[\s\S]|[^\]\\])*)\]\s*TJ|\(((?:\\[\s\S]|[^\\)])*)\)\s*(?:Tj|'|")|<([0-9A-Fa-f\s]*)>\s*Tj|\b(T\*|Td|TD|Tm|ET)\b/g;
  let m: RegExpExecArray | null;
  while ((m = ops.exec(content))) {
    if (m[1] !== undefined) font = fonts.get(m[1]);
    else if (m[2] !== undefined) {
      const parts = /\(((?:\\[\s\S]|[^\\)])*)\)|<([0-9A-Fa-f\s]*)>|(-?\d*\.?\d+)/g;
      let p: RegExpExecArray | null;
      while ((p = parts.exec(m[2]))) {
        if (p[1] !== undefined) out += decodeBytes(literalBytes(p[1]), font);
        else if (p[2] !== undefined) out += decodeBytes(hexBytes(p[2]), font);
        else if (Number(p[3]) < -180) out += " ";
      }
    } else if (m[3] !== undefined) out += decodeBytes(literalBytes(m[3]), font);
    else if (m[4] !== undefined) out += decodeBytes(hexBytes(m[4]), font);
    else out += m[5] === "ET" || m[5] === "T*" ? "\n" : " ";
  }
  return out;
}

/* --------------------------------- Main ----------------------------------- */

export async function analyzePdf(buffer: ArrayBuffer): Promise<PdfInfo> {
  const bytes = new Uint8Array(buffer);
  const raw = latin1(bytes); // one character per byte, so string positions = byte positions
  if (!raw.startsWith("%PDF")) throw new Error("This is not a valid PDF file.");

  const objects = await readObjects(raw, bytes);
  const all = Array.from(objects.values());
  const dicts = all.map((o) => o.dict);
  const fonts = fontMaps(objects);

  const pageCount = dicts.filter((d) => /\/Type\s*\/Page(?![a-zA-Z])/.test(d)).length;
  const counts = dicts.flatMap((d) => (/\/Type\s*\/Pages\b/.test(d) ? [Number(d.match(/\/Count\s+(\d+)/)?.[1] ?? 0)] : []));

  const links = Array.from(
    new Set(dicts.flatMap((d) => [...d.matchAll(/\/URI\s*\(((?:\\.|[^\\)])*)\)/g)].map((x) => decodeLiteral(x[1]).trim()))),
  ).filter(Boolean);

  const text = all
    .filter((o) => o.data && !/\/Type\s*\/(ObjStm|XObject)|\/Subtype\s*\/Image|CMapName|\/FontFile/.test(o.dict) && /\b(Tj|TJ)\b/.test(o.data))
    .map((o) => textFromContent(o.data!, fonts))
    .join("\n")
    .replace(/\0/g, "")
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n[\s\n]*/g, "\n")
    .trim();

  const info = dicts.filter((d) => /\/(Producer|Creator|Author|Title)\s*[(<]/.test(d) && !/\/Type\s*\//.test(d));

  return {
    version: raw.match(/^%PDF-(\d\.\d)/)?.[1] ?? "?",
    pages: pageCount || (counts.length ? Math.max(...counts) : 0),
    encrypted: /\/Encrypt\s/.test(raw),
    hasFonts: dicts.some((d) => /\/Type\s*\/Font\b/.test(d)),
    images: dicts.filter((d) => /\/Subtype\s*\/Image/.test(d)).length,
    title: metaField(info, "Title"),
    author: metaField(info, "Author"),
    creator: metaField(info, "Creator") || metaField(info, "Producer"),
    links,
    text,
    words: text.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length,
  };
}
