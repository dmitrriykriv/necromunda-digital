import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FactionCatalog } from '@shared/catalog';
import type { Roster, RosterIndex } from '@shared/roster';
import { factionCatalogUrl } from '@/lib/paths';
import { api } from './client';

export async function fetchRoster(file: string) {
  const { data } = await api.get<Roster>(`/rosters/${encodeURIComponent(file)}`);
  return data;
}

const KEY = ['rosters'] as const;

export function useRosterIndex() {
  return useQuery({
    queryKey: KEY,
    queryFn: async () => {
      const { data } = await api.get<RosterIndex>('/rosters');
      return data;
    },
  });
}

export function useRosterFile(file: string | null) {
  return useQuery({
    queryKey: [...KEY, file],
    enabled: Boolean(file),
    queryFn: async () => {
      const { data } = await api.get<Roster>(`/rosters/${encodeURIComponent(file!)}`);
      return data;
    },
  });
}

export function useSaveRoster() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (roster: Roster) => {
      const { data } = await api.put<{ ok: boolean; file: string; roster: Roster; index: RosterIndex }>(
        '/rosters',
        roster,
      );
      return data;
    },
    onSuccess: (data) => {
      client.setQueryData(KEY, data.index);
    },
  });
}

export function useDeleteRoster() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (file: string) => {
      const { data } = await api.delete<{ ok: boolean; index: RosterIndex }>(
        `/rosters/${encodeURIComponent(file)}`,
      );
      return data;
    },
    onSuccess: (data) => {
      client.setQueryData(KEY, data.index);
    },
  });
}

export function useApiHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await api.get<{ ok: boolean }>('/health');
      return data;
    },
    retry: false,
  });
}

export function useFactionCatalog(factionId: string) {
  return useQuery({
    queryKey: ['faction-catalog', factionId],
    enabled: Boolean(factionId),
    queryFn: async () => {
      const res = await fetch(factionCatalogUrl(factionId));
      if (!res.ok) throw new Error('Список банды не найден');
      return res.json() as Promise<FactionCatalog>;
    },
    staleTime: 60_000,
  });
}
