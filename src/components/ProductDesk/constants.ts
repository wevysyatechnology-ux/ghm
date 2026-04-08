import { RequestStatus, AppName, TabId } from './types';

export const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: '#6EE7B7', bg: 'rgba(110,231,183,0.12)' },
  under_review: { label: 'Under Review', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)' },
  planned: { label: 'Planned', color: '#60A5FA', bg: 'rgba(96,165,250,0.12)' },
  in_progress: { label: 'In Progress', color: '#F97316', bg: 'rgba(249,115,22,0.12)' },
  completed: { label: 'Completed', color: '#4ADE80', bg: 'rgba(74,222,128,0.15)' },
  rejected: { label: 'Rejected', color: '#F87171', bg: 'rgba(248,113,113,0.12)' },
};

export const APP_NAMES: AppName[] = [
  'WeVysya AI',
  'WeVysya Social',
  'WeVysya Meeting Companion',
  'GHM',
];

export const APP_COLORS: Record<AppName, string> = {
  'WeVysya AI': '#6EE7B7',
  'WeVysya Social': '#60A5FA',
  'WeVysya Meeting Companion': '#F97316',
  'GHM': '#FBBF24',
};

export const STATUS_FLOW: RequestStatus[] = [
  'new',
  'under_review',
  'planned',
  'in_progress',
  'completed',
  'rejected',
];

export const TABS: { id: TabId; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'bugs', label: 'Bugs' },
  { id: 'features', label: 'Features' },
  { id: 'top_voted', label: 'Top Voted' },
  { id: 'in_progress', label: 'In Progress' },
  { id: 'completed', label: 'Completed' },
];
