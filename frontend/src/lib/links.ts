/** Ссылки на справочник. Главная — корень сервера (`/`), без index.html. */
import { handbookRoot } from '@/lib/paths';

const ROOT = handbookRoot();

function handbookHome() {
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:8000/`;
  }
  return new URL('../../', window.location.href).href;
}

export const handbook = {
  home: handbookHome(),
  example: `${ROOT}/pages/roster-example.html`,
  gangs: `${ROOT}/pages/gangs.html`,
  createGang: `${ROOT}/pages/core-rules.html#sozdanie-bandy`,
};
