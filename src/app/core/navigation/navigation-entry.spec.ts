import { Permission } from '../auth/permission';
import { NavigationEntry, visibleNavigationEntries } from './navigation-entry';

const ENTRIES: NavigationEntry[] = [
  {
    label: 'Users',
    route: '/admin/users',
    requiredPermission: Permission.UsersManage,
  },
  {
    label: 'Audit',
    route: '/admin/audit',
    requiredPermission: Permission.AuditRead,
  },
];

describe('visibleNavigationEntries', () => {
  it('should keep only entries whose permissions are effective', () => {
    const visible = visibleNavigationEntries(
      ENTRIES,
      (permission) => permission === Permission.AuditRead,
    );

    expect(visible).toEqual([ENTRIES[1]]);
  });

  it('should hide every entry when the user has no effective permissions', () => {
    expect(visibleNavigationEntries(ENTRIES, () => false)).toEqual([]);
  });
});
