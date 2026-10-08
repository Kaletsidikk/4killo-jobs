export interface JobSource {
  postUrl: string;
  sourceName: string;
  postedAt: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  category: string;
  employmentType: string | null;
  experienceLevel: string;
  salary: string | null;
  deadline: string | null;
  createdAt: string;
  sources: JobSource[];
  sourceCount: number;
  isSaved: boolean;
}

export interface ForYouJob extends Job {
  score: number;
  matchLabel: string;
  matchReasons: string[];
  applyLink: string | null;
  applyLinkType: string | null;
}

export interface JobsResponse {
  data: Job[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ForYouResponse {
  data: ForYouJob[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  meta: {
    hasPreferences: boolean;
    scoringWeights: {
      category: number;
      location: number;
      experience: number;
      fresh: number;
    };
  };
}

export interface JobDetails extends Job {
  description: string;
  requirements: string | null;
  education: string | null;
  applyUrl: string | null;
  applyEmail: string | null;
  applyPhone: string | null;
  isDirectContact: boolean;
}