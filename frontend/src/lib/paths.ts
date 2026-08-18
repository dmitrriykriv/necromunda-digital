/** Пути к статике справочника. В dev — прокси Vite, в сборке — относительно страницы. */

export function factionCatalogUrl(factionId: string) {
  const file = `factions/${encodeURIComponent(factionId)}.json`;
  if (import.meta.env.DEV) return `/data/${file}`;
  return new URL(`./data/${file}`, window.location.href).href;
}

export function apiBaseUrl() {
  if (import.meta.env.DEV) return '/api';
  return new URL('../../api/', window.location.href).href;
}

export function handbookRoot() {
  if (import.meta.env.DEV) {
    return `${window.location.protocol}//${window.location.hostname}:8000`;
  }
  return '../..';
}
