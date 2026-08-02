/** Inline [download] markers inside an article body. */

export type DownloadMarker = {
  /** Position of the marker in the raw body string. */
  index: number;
  raw: string;
  path: string;
  name: string;
  size: number;
};

export type BodySegment =
  | { kind: "text"; text: string }
  | { kind: "download"; marker: DownloadMarker };

export const DOWNLOAD_MARKER = /\[download(?::([^\]|]*)\|([^\]|]*)\|(\d+))?\]/g;

export function findDownloadMarkers(body: string): DownloadMarker[] {
  const out: DownloadMarker[] = [];
  const re = new RegExp(DOWNLOAD_MARKER.source, "g");
  let m: RegExpExecArray | null;
  while ((m = re.exec(body))) {
    out.push({
      index: m.index,
      raw: m[0],
      path: m[1] ?? "",
      name: m[2] ?? "",
      size: Number(m[3] ?? 0),
    });
  }
  return out;
}

export function splitBody(body: string): BodySegment[] {
  const segments: BodySegment[] = [];
  let cursor = 0;
  for (const marker of findDownloadMarkers(body)) {
    if (marker.index > cursor) {
      segments.push({ kind: "text", text: body.slice(cursor, marker.index) });
    }
    segments.push({ kind: "download", marker });
    cursor = marker.index + marker.raw.length;
  }
  if (cursor < body.length) segments.push({ kind: "text", text: body.slice(cursor) });
  return segments;
}

export const buildMarker = (path: string, name: string, size: number) =>
  `[download:${path}|${name.replace(/[|\]]/g, "-")}|${size}]`;

/** Replace the marker at `index` (raw length `rawLength`) with new text. */
export function replaceMarkerAt(
  body: string,
  index: number,
  rawLength: number,
  replacement: string,
) {
  return body.slice(0, index) + replacement + body.slice(index + rawLength);
}
