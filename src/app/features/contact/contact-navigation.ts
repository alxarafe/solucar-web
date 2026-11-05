export const CONTACTS_PATH = '/contacts';
export const CONTACTS_NEW_PATH = `${CONTACTS_PATH}/new`;
export const CONTACTS_EDIT_SEGMENT = 'edit';

export function contactEditPath(id: number): string {
  return `${CONTACTS_PATH}/${id}/${CONTACTS_EDIT_SEGMENT}`;
}
