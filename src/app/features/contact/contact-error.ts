export function contactErrorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'error' in error) {
    const httpError = error as { error: unknown };
    if (httpError.error && typeof httpError.error === 'object' && 'detail' in httpError.error) {
      const problemDetail = httpError.error as { detail: unknown };
      if (typeof problemDetail.detail === 'string') {
        return problemDetail.detail;
      }
    }
  }
  return $localize`:@@contact.error.unexpected:Unable to communicate with Alixar.`;
}
