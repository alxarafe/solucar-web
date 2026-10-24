export interface NavigationEntry {
  readonly label: string;
  readonly route: string;
  readonly requiredPermission: string;
}

export function visibleNavigationEntries(
  entries: readonly NavigationEntry[],
  hasPermission: (permission: string) => boolean,
): NavigationEntry[] {
  return entries.filter((entry) => hasPermission(entry.requiredPermission));
}
