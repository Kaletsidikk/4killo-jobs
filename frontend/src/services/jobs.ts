import { apiRequest } from "./api";
import type { JobsResponse, JobDetails, Job } from "../types/job";
import { saveLocalJob, unsaveLocalJob, getLocalSavedJobs } from "./savedStorage";

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

// Save job with local fallback
export async function saveJob(job: Job | string) {
  const jobId = typeof job === "string" ? job : job.id;
  if (typeof job !== "string") {
    saveLocalJob(job);
  }

  try {
    return await apiRequest(`/jobs/${jobId}/save`, {
      method: "POST",
    });
  } catch (err) {
    console.warn("Backend saveJob skipped/failed, saved locally:", err);
    return { success: true, localOnly: true };
  }
}

// Unsave job with local fallback
export async function unsaveJob(jobId: string) {
  unsaveLocalJob(jobId);

  try {
    return await apiRequest(`/jobs/${jobId}/save`, {
      method: "DELETE",
    });
  } catch (err) {
    console.warn("Backend unsaveJob skipped/failed, removed locally:", err);
    return { success: true, localOnly: true };
  }
}

export async function getSavedJobs(): Promise<JobsResponse> {
  const localSaved = getLocalSavedJobs();

  try {
    const res = await apiRequest("/jobs/saved");
    if (res?.data) {
      // Merge backend bookmarks with any locally bookmarked jobs
      const backendIds = new Set(res.data.map((j: Job) => j.id));
      const merged = [
        ...res.data,
        ...localSaved.filter((j) => !backendIds.has(j.id)),
      ];
      return { data: merged, pagination: res.pagination || { total: merged.length, page: 1, limit: 50, totalPages: 1 } };
    }
  } catch (err) {
    console.warn("Backend getSavedJobs unavailable, using local bookmarks:", err);
  }

  return {
    data: localSaved,
    pagination: { total: localSaved.length, page: 1, limit: 50, totalPages: 1 },
  };
}

export async function getForYouJobs(
  page = 1,
  limit = 10,
  prefs?: { categories?: string[]; locations?: string[]; experienceLevel?: string }
): Promise<JobsResponse> {
  const params = new URLSearchParams();
  params.set("page", String(page));
  params.set("limit", String(limit));
  if (prefs?.categories && prefs.categories.length > 0) {
    params.set("categories", prefs.categories.join(","));
  }
  if (prefs?.locations && prefs.locations.length > 0) {
    params.set("locations", prefs.locations.join(","));
  }
  if (prefs?.experienceLevel && prefs.experienceLevel !== "NOT_SPECIFIED") {
    params.set("experienceLevel", prefs.experienceLevel);
  }
  return apiRequest(`/jobs/for-you?${params.toString()}`);
}

export async function parseVoiceIntent(transcript: string) {
  return apiRequest("/voice/parse-intent", {
    method: "POST",
    body: JSON.stringify({ transcript }),
  });
}