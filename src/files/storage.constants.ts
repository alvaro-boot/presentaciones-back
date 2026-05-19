/** Referencia estable en HTML; la URL firmada se genera al mostrar. */
export const STORAGE_REF_PREFIX = '__STORAGE__:';

export function toStorageRef(path: string): string {
  return `${STORAGE_REF_PREFIX}${path}`;
}

export function extractStoragePaths(html: string): string[] {
  const paths = new Set<string>();
  const re = /__STORAGE__:([^"'\s>)]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    paths.add(decodeURIComponent(m[1]));
  }
  return [...paths];
}
