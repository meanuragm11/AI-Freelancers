export function matchesSearch(
  fields: Array<string | number | null | undefined>,
  search: string | undefined
): boolean {
  const query = search?.trim().toLowerCase();
  if (!query) return true;

  return fields.some((field) => {
    if (field === null || field === undefined) return false;
    return String(field).toLowerCase().includes(query);
  });
}

export function filterBySearch<T>(
  items: T[],
  search: string | undefined,
  getFields: (item: T) => Array<string | number | null | undefined>
): T[] {
  if (!search?.trim()) return items;
  return items.filter((item) => matchesSearch(getFields(item), search));
}
