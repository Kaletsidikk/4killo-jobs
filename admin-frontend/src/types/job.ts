export interface AdminJobSource {
  sourceName: string;
  postUrl: string;
  postedAt: string | null;
  source: {
    id: string;
    name: string;
    type: string;
  };
}

export interface AdminJob {
  id: string;
  title: string;
  company: string;
  location: string | null;
  category: string | null;
  employmentType: string | null;
  experienceLevel: string;
  education: string | null;
  salary: string | null;
  deadline: string | null;
  description: string | null;
  requirements: string | null;
  applyUrl: string | null;
  applyEmail: string | null;
  applyPhone: string | null;
  isDirectContact: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sources: AdminJobSource[];
  _count: {
    savedBy: number;
  };
}

export interface AdminJobsPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface AdminJobsResponse {
  jobs: AdminJob[];
  pagination: AdminJobsPagination;
}