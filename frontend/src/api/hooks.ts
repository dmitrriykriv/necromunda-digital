import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FactionCatalog } from '@shared/catalog';
import type { CampaignIndex } from '@shared/campaign';
import type { Roster, RosterIndex } from '@shared/roster';
import { factionCatalogUrl } from '@/lib/paths';
import { api } from './client';

export function rosterBase(campaignId = '') {
  return campaignId
    ? `/campaigns/${encodeURIComponent(campaignId)}/rosters`
    : '/rosters';
}

export async function fetchRoster(file: string, campaignId = '') {
  const { data } = await api.get<Roster>(`${rosterBase(campaignId)}/${encodeURIComponent(file)}`);
  return data;
}

const KEY = ['rosters'] as const;

export function useCampaignIndex() {
  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data } = await api.get<CampaignIndex>('/campaigns');
      return data;
    },
  });
}

export function useRosterIndex(campaignId = '') {
  return useQuery({
    queryKey: [...KEY, campaignId],
    queryFn: async () => {
      const { data } = await api.get<RosterIndex>(rosterBase(campaignId));
      return data;
    },
  });
}

export function useRosterFile(file: string | null, campaignId = '') {
  return useQuery({
    queryKey: [...KEY, campaignId, file],
    enabled: Boolean(file),
    queryFn: async () => fetchRoster(file!, campaignId),
  });
}

export function useSaveRoster() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { roster: Roster; campaignId?: string }) => {
      const campaignId = input.campaignId ?? '';
      const { data } = await api.put<{ ok: boolean; file: string; roster: Roster; index: RosterIndex }>(
        rosterBase(campaignId),
        input.roster,
      );
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      client.setQueryData([...KEY, data.campaignId], data.index);
    },
  });
}

export function useDeleteRoster() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (input: { file: string; campaignId?: string }) => {
      const campaignId = input.campaignId ?? '';
      const { data } = await api.delete<{ ok: boolean; index: RosterIndex }>(
        `${rosterBase(campaignId)}/${encodeURIComponent(input.file)}`,
      );
      return { ...data, campaignId };
    },
    onSuccess: (data) => {
      client.setQueryData([...KEY, data.campaignId], data.index);
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
