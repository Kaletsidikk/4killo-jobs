export type SourceType =
  | "TELEGRAM_CHANNEL"
  | "TELEGRAM_GROUP"
  | "WEBSITE";

export type SourceStatus =
  | "ACTIVE"
  | "PAUSED"
  | "ERROR";

export interface Source {
  id: string;
  name: string;
  identifier: string;
  type: SourceType;
  status: SourceStatus;
  totalJobsScraped: number;
  lastSyncAt: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SourceStats {
  totalSources: number;
  activeSources: number;
  pausedSources: number;
  errorSources: number;
  totalJobsLinked: number;
}

export interface SourcesResponse {
  sources: Source[];
  stats: SourceStats;
}