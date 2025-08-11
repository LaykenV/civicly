export function parseBillDate(input?: string): Date | null {
  if (!input) return null;
  const s = String(input).trim();

  // Formats like 20240131 (YYYYMMDD)
  if (/^\d{8}$/.test(s)) {
    const year = Number(s.slice(0, 4));
    const month = Number(s.slice(4, 6)) - 1; // 0-based
    const day = Number(s.slice(6, 8));
    const d = new Date(Date.UTC(year, month, day));
    return isNaN(d.getTime()) ? null : d;
  }

  // ISO-like dates such as 2024-01-31 or 2024-01-31T00:00:00Z
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d;
  }

  // Unix seconds timestamp as string
  if (/^\d{10}$/.test(s)) {
    const d = new Date(Number(s) * 1000);
    return isNaN(d.getTime()) ? null : d;
  }

  // Unix milliseconds timestamp as string
  if (/^\d{13}$/.test(s)) {
    const d = new Date(Number(s));
    return isNaN(d.getTime()) ? null : d;
  }

  // Fallback to Date parsing
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDate(dateString?: string): string {
  const d = parseBillDate(dateString);
  return d
    ? d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })
    : "";
}
