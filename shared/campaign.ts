export type CampaignStatus = 'active' | 'finished';

export type CampaignEventMode = 'full' | 'short';

export type CampaignMeta = {
  id: string;
  name: string;
  occupation: number;
  downtime: number;
  takeover: number;
  liveCycle: number;
  eventMode: CampaignEventMode;
  status: CampaignStatus;
  updatedAt: string;
};

export type CampaignPlayer = {
  id: string;
  name: string;
  gangName: string;
  rosterFile: string;
  sourceRosterFile: string;
  reputation: number;
  rating: number;
  wealth: number;
  battles: number;
  ooa: number;
};

export type CampaignTerritory = {
  id: string;
  name: string;
  kind: string;
  status: string;
  ownerId: string;
};

export type CampaignCustomType = {
  id: string;
  name: string;
  income: number | '';
  extras: string;
};

export type CampaignTypes = {
  disabled: string[];
  custom: CampaignCustomType[];
};

/** Только списки, которые арбитр изменил. Остальные берутся из кода страницы. */
export type CampaignNames = Record<string, string[]>;

export type CampaignCycleEvent = {
  playerId: string;
  targetId: string;
  stakeId: string;
  challenge: string;
  opponentId: string;
  result: string;
  ooa: number;
  sideJob: boolean;
  notes: string;
  stakePriorId: string;
  stakePriorStatus: string;
  stakePriorOwnerId: string;
};

export type CampaignCycleAction = {
  id: string;
  playerId: string;
  fighter: string;
  action: string;
};

/** Один бой укороченного цикла: вызывающий и отвечающий на одной карточке. Исход — со стороны вызывающего. */
export type CampaignBattle = {
  id: string;
  challengerId: string;
  responderId: string;
  stakeId: string;
  challenge: string;
  result: string;
  challengerOoa: number;
  responderOoa: number;
  challengerSideJob: boolean;
  responderSideJob: boolean;
  challengerNotes: string;
  responderNotes: string;
  stakePriorId: string;
  stakePriorStatus: string;
  stakePriorOwnerId: string;
};

export type CampaignCycle = {
  cycle: number;
  events: CampaignCycleEvent[];
  actions: CampaignCycleAction[];
  battles: CampaignBattle[];
};

export type CampaignDocument = {
  campaign: CampaignMeta;
  players: CampaignPlayer[];
  territories: CampaignTerritory[];
  types: CampaignTypes;
  names: CampaignNames;
  cycles: CampaignCycle[];
};

export type CampaignIndexItem = {
  id: string;
  name: string;
  status: CampaignStatus;
  liveCycle: number;
  players: number;
  updatedAt: string;
};

export type CampaignIndex = {
  campaigns: CampaignIndexItem[];
};
