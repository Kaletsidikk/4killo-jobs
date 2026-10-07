export interface JobSource {
  postUrl: string;
  sourceName: string;
  postedAt: string;
  rawText?: string;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  category: string;
  employmentType: string;
  experienceLevel: string;
  salary: string | null;
  deadline: string | null;
  //description: string;
  //isDirectContact: boolean;
  createdAt: string;
  sources: JobSource[];
  sourceCount: number;
  isSaved: boolean;
  score?: number;
  matchLabel?: string | null;
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

export interface JobsResponse {
  data: Job[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}