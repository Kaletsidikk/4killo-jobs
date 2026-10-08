export interface AdminMetrics {
  summary: {
    jobs: {
      total: number;
      active: number;
      inactive: number;
      addedLast24h: number;
      addedLast7d: number;
    };

    users: {
      total: number;
      newLast7d: number;
      withAlertsEnabled: number;
    };

    engagement: {
      totalBookmarks: number;
    };

    sources: {
      total: number;
      active: number;
      paused: number;
      error: number;
      totalScrapedAllTime: number;
    };
  };

  breakdowns: {
    categories: {
      category: string | null;
      count: number;
    }[];

    locations: {
      location: string | null;
      count: number;
    }[];

    sourceTypes: {
      type: string;
      count: number;
    }[];
  };

  timestamp: string;
}