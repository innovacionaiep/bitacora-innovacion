export function normalizeUsuarioNameQuery(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export function filterUsuariosByName<T extends { name: string | null }>(
  users: T[],
  query: string
): T[] {
  const q = normalizeUsuarioNameQuery(query);
  if (!q) return users;
  return users.filter((u) => {
    if (!u.name) return false;
    return normalizeUsuarioNameQuery(u.name).includes(q);
  });
}
