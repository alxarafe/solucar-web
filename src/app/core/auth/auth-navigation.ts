import { DefaultUrlSerializer, PRIMARY_OUTLET } from '@angular/router';

export const DEFAULT_AUTHENTICATED_PATH = '/contacts';
export const LOGIN_PATH = '/login';
const UNSAFE_RETURN_URL = /[\\\u0000-\u0020\u007f]/;

export function safeReturnUrl(candidate: string | null): string {
  if (
    !candidate ||
    !candidate.startsWith('/') ||
    candidate.startsWith('//') ||
    UNSAFE_RETURN_URL.test(candidate)
  ) {
    return DEFAULT_AUTHENTICATED_PATH;
  }

  try {
    const serializer = new DefaultUrlSerializer();
    const target = serializer.parse(candidate);
    const firstSegment = target.root.children[PRIMARY_OUTLET]?.segments[0]?.path;
    if (firstSegment === LOGIN_PATH.slice(1)) {
      return DEFAULT_AUTHENTICATED_PATH;
    }
    return serializer.serialize(target);
  } catch {
    return DEFAULT_AUTHENTICATED_PATH;
  }
}
