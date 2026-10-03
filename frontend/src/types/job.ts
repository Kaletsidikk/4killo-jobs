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
  employmentType: string;
  experienceLevel: string;
  salary: string | null;
  deadline: string | null;
  description: string;
  isDirectContact: boolean;
  createdAt: string;
  sources: JobSource[];
  isSaved: boolean;
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