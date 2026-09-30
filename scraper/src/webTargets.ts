export interface WebTarget {
  id: string;
  name: string;
  baseUrl: string;
  listingUrl: string;
  categoryHint: string;
  /**
   * CSS selector for individual job cards on the listing page
   */
  cardSelector: string;
  /**
   * Relative or absolute selectors inside each card
   */
  fields: {
    titleSelector: string;
    companySelector: string;
    linkSelector: string;
    locationSelector?: string;
    deadlineSelector?: string;
  };
}

export const WEB_TARGETS: WebTarget[] = [
  {
    id: 'ethiojobs_public',
    name: 'Ethiojobs Portal',
    baseUrl: 'https://www.ethiojobs.net',
    listingUrl: 'https://www.ethiojobs.net/browse-by-category/',
    categoryHint: 'All Sectors',
    cardSelector: '.listing-item, .job-item, .similar-jobs',
    fields: {
      titleSelector: 'h2 a, .title a, a.job-title',
      companySelector: '.company-name, .employer, span.company',
      linkSelector: 'h2 a, .title a, a.job-title',
      locationSelector: '.location, .job-location',
      deadlineSelector: '.deadline, .date-posted'
    }
  },
  {
    id: 'ha-jobs_public',
    name: 'Harmee Jobs / Habesha Jobs',
    baseUrl: 'https://harmeejobs.com',
    listingUrl: 'https://harmeejobs.com/jobs/',
    categoryHint: 'NGO, Banking & Government',
    cardSelector: 'a[href*="/job/"]',
    fields: {
      titleSelector: 'a',
      companySelector: '.job-company, .company, span',
      linkSelector: 'a',
      locationSelector: '.job-location, span',
      deadlineSelector: '.job-deadline, span'
    }
  }
];
