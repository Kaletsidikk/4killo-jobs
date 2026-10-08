import type { Job } from "../types/job";

const SAVED_JOBS_KEY = "mela_felagi_dev_saved_jobs";

function getSavedJobsFromStorage(): Job[] {
  const stored = localStorage.getItem(SAVED_JOBS_KEY);

  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as Job[];
  } catch {
    return [];
  }
}

function saveJobsToStorage(jobs: Job[]) {
  localStorage.setItem(
    SAVED_JOBS_KEY,
    JSON.stringify(jobs)
  );
}

export function getLocalSavedJobs(): Job[] {
  return getSavedJobsFromStorage();
}

export function isLocalJobSaved(jobId: string): boolean {
  return getSavedJobsFromStorage().some(
    (job) => job.id === jobId
  );
}

export function saveJobLocally(job: Job): void {
  const savedJobs = getSavedJobsFromStorage();

  const alreadySaved = savedJobs.some(
    (savedJob) => savedJob.id === job.id
  );

  if (alreadySaved) {
    return;
  }

  saveJobsToStorage([
    ...savedJobs,
    {
      ...job,
      isSaved: true,
    },
  ]);
}

export function removeLocalSavedJob(jobId: string): void {
  const savedJobs = getSavedJobsFromStorage();

  const updatedJobs = savedJobs.filter(
    (job) => job.id !== jobId
  );

  saveJobsToStorage(updatedJobs);
}