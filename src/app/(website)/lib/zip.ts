// Minimal ZIP reader. .docx and .xlsx files are ZIP archives full of XML files.
// Uses the browser's built-in DecompressionStream, so no extra package is needed.

export async function inflate(data: Uint8Array, format: CompressionFormat): Promise<Uint8Array> {
  const stream = new Blob([data.slice()]).stream().pipeThrough(new DecompressionStream(format));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

export type ZipEntry = { name: string; size: number; read: () => Promise<Uint8Array> };

export function readZip(buffer: ArrayBuffer): Map<string, ZipEntry> {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);

  // "End of central directory" record is near the end of the file.
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("This file is not a valid Office file (ZIP structure not found).");

  const count = view.getUint16(eocd + 10, true);
  let pos = view.getUint32(eocd + 16, true);
  const decoder = new TextDecoder();
  const entries = new Map<string, ZipEntry>();

  for (let i = 0; i < count; i++) {
    if (view.getUint32(pos, true) !== 0x02014b50) break;
    const method = view.getUint16(pos + 10, true);
    const compressedSize = view.getUint32(pos + 20, true);
    const size = view.getUint32(pos + 24, true);
    const nameLength = view.getUint16(pos + 28, true);
    const extraLength = view.getUint16(pos + 30, true);
    const commentLength = view.getUint16(pos + 32, true);
    const localOffset = view.getUint32(pos + 42, true);
    const name = decoder.decode(bytes.subarray(pos + 46, pos + 46 + nameLength));

    entries.set(name, {
      name,
      size,
      read: async () => {
        const start = localOffset + 30 + view.getUint16(localOffset + 26, true) + view.getUint16(localOffset + 28, true);
        const data = bytes.subarray(start, start + compressedSize);
        if (method === 0) return data;
        if (method === 8) return inflate(data, "deflate-raw");
        throw new Error(`Unsupported compression in ${name}.`);
      },
    });
    pos += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

export async function readZipText(entries: Map<string, ZipEntry>, name: string): Promise<string | null> {
  const entry = entries.get(name);
  if (!entry) return null;
  return new TextDecoder().decode(await entry.read());
}

export function parseXml(text: string): Document {
  return new DOMParser().parseFromString(text, "application/xml");
}
