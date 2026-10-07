import type { Job } from "../types/job";

const SAVED_JOBS_KEY = "4killo_local_saved_jobs";

export function getLocalSavedJobs(): Job[] {
  try {
    const raw = localStorage.getItem(SAVED_JOBS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isLocalJobSaved(jobId: string): boolean {
  const jobs = getLocalSavedJobs();
  return jobs.some((j) => j.id === jobId);
}

export function saveLocalJob(job: Job): Job[] {
  const jobs = getLocalSavedJobs();
  if (!jobs.some((j) => j.id === job.id)) {
    const updated = [{ ...job, isSaved: true }, ...jobs];
    localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(updated));
    return updated;
  }
  return jobs;
}

export function unsaveLocalJob(jobId: string): Job[] {
  const jobs = getLocalSavedJobs();
  const updated = jobs.filter((j) => j.id !== jobId);
  localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(updated));
  return updated;
}
