import { apiRequest } from "./api";
import type { JobsResponse, Job } from "../types/job";

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
): Promise<Job> {
  return apiRequest(`/jobs/${id}`);
}