import { apiRequest } from "./api";

export interface JobSource {
  id: string;
  name: string;
  identifier: string;
  type: string;
  totalJobs: number;
  lastSyncAt: string | null;
}

export interface SourcesResponse {
  data: JobSource[];
  totalActiveSources: number;
}

export async function getSources(): Promise<SourcesResponse> {
  return apiRequest("/sources");
}

export async function getSourceById(
  id: string
): Promise<JobSource> {
  return apiRequest(`/sources/${id}`);
}