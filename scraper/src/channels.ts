export interface ChannelTarget {
  name: string;
  handle: string;
  categoryHint: string;
}

export const TARGET_CHANNELS: ChannelTarget[] = [
  {
    name: 'Ethiojobs Official',
    handle: 'ethiojobsofficial',
    categoryHint: 'All Sectors'
  },
  {
    name: 'Afri Work',
    handle: 'freelance_ethio',
    categoryHint: 'General Vacancies'
  },
  {
    name: 'Sheger Jobs',
    handle: 'shegerjobs',
    categoryHint: 'General Vacancies'
  },
  {
    name: 'Beleqet Jobs',
    handle: 'BeleqetJobs',
    categoryHint: 'NGO & Government'
  }
];
