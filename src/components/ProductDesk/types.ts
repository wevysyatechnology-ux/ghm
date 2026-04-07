export type RequestType = 'bug' | 'feature';
export type AppName = 'WeVysya AI' | 'WeVysya Social' | 'WeVysya Meeting Companion';
export type RequestStatus = 'new' | 'under_review' | 'planned' | 'in_progress' | 'completed' | 'rejected';

export interface ProductRequest {
  id: string;
  title: string;
  description: string;
  type: RequestType;
  app_name: AppName;
  submitter_name: string;
  submitter_email: string;
  user_id: string | null;
  status: RequestStatus;
  votes_count: number;
  is_pinned: boolean;
  official_response: string | null;
  screenshot_url: string | null;
  created_at: string;
  updated_at: string;
  user_voted?: boolean;
  comments_count?: number;
}

export interface ProductComment {
  id: string;
  request_id: string;
  commenter_name: string;
  commenter_email: string | null;
  user_id: string | null;
  message: string;
  is_official: boolean;
  created_at: string;
}

export type TabId = 'all' | 'bugs' | 'features' | 'top_voted' | 'in_progress' | 'completed';
