export function dedupeByKey<T>(items: T[], keyFn: (item: T) => string): T[] {
  const seen = new Set<string>();
  const result: T[] = [];

  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function dedupeStrings(items: string[]): string[] {
  return dedupeByKey(items, (item) => item);
}

export function dedupeModels(
  models: Array<{ name: string; fields: string[]; sourceKey?: string }>
): Array<{ name: string; fields: string[] }> {
  return dedupeByKey(models, (model) => model.sourceKey || model.name).map(
    ({ name, fields }) => ({ name, fields })
  );
}

export function dedupeRoutes(routes: string[]): string[] {
  return dedupeStrings(routes).sort();
}
