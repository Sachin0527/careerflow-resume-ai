export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

export const CLIENT_ID_STORAGE_KEY = 'careerflow_client_id';
export const THEME_STORAGE_KEY = 'careerflow_theme';

export const SUGGESTED_PROMPTS = [
  {
    id: 'company',
    label: 'Optimize for Google',
    prompt: 'Optimize my resume for Google',
  },
  {
    id: 'translate',
    label: 'Translate to Spanish (MX)',
    prompt: 'Translate this to Spanish for the Mexican market',
  },
  {
    id: 'jd',
    label: 'Match a job description',
    prompt: 'Update my experience section to better match this job description:\n',
    needsJd: true,
  },
  {
    id: 'skills',
    label: 'Tailor skills (Data Scientist)',
    prompt: 'Make my skills section more relevant for a data scientist role',
  },
];

export const AGENT_LABELS = {
  companyAgent: 'Company Research & Optimization',
  jdMatchAgent: 'JD Matching & Scoring',
  translationAgent: 'Translation & Localization',
  sectionAgent: 'Section Enhancement',
};
