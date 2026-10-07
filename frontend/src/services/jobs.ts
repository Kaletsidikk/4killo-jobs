import { apiRequest } from "./api";
import type { JobsResponse, JobDetails } from "../types/job";

export async function getJobs(
  
  params: {
    search?: string;
    category?: string;
    location?: string;
    experienceLevel?: string;
    employmentType?: string;
    page?: number;
    limit?: number;
  } = {}
): Promise<JobsResponse> {
  const searchParams = new URLSearchParams();

  if (params.search) {
    searchParams.set("search", params.search);
  }

  if (params.category) {
    searchParams.set("category", params.category);
  }

  if (params.location) {
    searchParams.set("location", params.location);
  }

  if (params.experienceLevel) {
    searchParams.set("experienceLevel", params.experienceLevel);
  }

  if (params.employmentType) {
    searchParams.set("employmentType", params.employmentType);
  }

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("limit", String(params.limit ?? 10));

  const query = searchParams.toString();

  return apiRequest(`/jobs?${query}`);
}

export async function getJobById(
  id: string
): Promise<JobDetails> {
  return apiRequest(`/jobs/${id}`);
}

export interface JobCategory {
  category: string;
  count: number;
}

export async function getJobCategories(): Promise<{
  data: JobCategory[];
}> {
  return apiRequest("/jobs/categories");
}

//save jobs
export async function saveJob(jobId: string) {
  return apiRequest(`/jobs/${jobId}/save`, {
    method: "POST",
  });
}

export async function unsaveJob(jobId: string) {
  return apiRequest(`/jobs/${jobId}/save`, {
    method: "DELETE",
  });
}

export async function getSavedJobs(): Promise<JobsResponse> {
  return apiRequest("/jobs/saved");
}

export async function getForYouJobs(
  page = 1,
  limit = 10
): Promise<JobsResponse> {
  return apiRequest(`/jobs/for-you?page=${page}&limit=${limit}`);
}

export async function parseVoiceIntent(transcript: string) {
  return apiRequest("/voice/parse-intent", {
    method: "POST",
    body: JSON.stringify({ transcript }),
  });
}