import { useRosterStore } from '@/store/rosterStore';

export const UNSAVED_PROMPT =
  'В ростере есть несохранённые изменения. Продолжить без сохранения?';

export function confirmUnsaved(): boolean {
  if (!useRosterStore.getState().isDirty()) return true;
  return window.confirm(UNSAVED_PROMPT);
}
