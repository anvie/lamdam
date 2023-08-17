



export function truncate(str: string, n: number): string {
  if (!str) return "";
  return str.length > n ? str.substring(0, n - 1) + "…" : str;
}
