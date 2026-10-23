import { DEFAULT_AUTHENTICATED_PATH, safeReturnUrl } from './auth-navigation';

describe('safeReturnUrl', () => {
  it('should keep an internal path', () => {
    expect(safeReturnUrl('/contacts?tab=1#result')).toBe('/contacts?tab=1#result');
  });

  it('should fall back for a missing value', () => {
    expect(safeReturnUrl(null)).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it('should reject an absolute external URL', () => {
    expect(safeReturnUrl('https://evil.example/contacts')).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it('should reject a protocol-relative external URL', () => {
    expect(safeReturnUrl('//evil.example/contacts')).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it('should reject a return to the login page', () => {
    expect(safeReturnUrl('/login')).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it('should reject a relative path that is not root-relative', () => {
    expect(safeReturnUrl('contacts')).toBe(DEFAULT_AUTHENTICATED_PATH);
  });

  it.each([
    '//localhost/contacts',
    '/\\evil.example/contacts',
    '/\nevil.example',
    '/login;mode=1',
    '/%6cogin?returnUrl=/login',
    '/login/child',
    '/contacts?bad=%',
  ])('should reject unsafe or recursive target %s', (target) => {
    expect(safeReturnUrl(target)).toBe(DEFAULT_AUTHENTICATED_PATH);
  });
});
