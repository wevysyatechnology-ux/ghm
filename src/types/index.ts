export type UserRole = 'super_admin' | 'global_admin' | 'zone_admin' | 'house_admin' | 'member';

export interface Profile {
  id: string;
  email: string;
  full_name: string;
  role: UserRole;
  approval_status?: 'pending' | 'approved' | 'rejected';
  house_id?: string;
  zone?: string;
  business?: string;
  industry?: string;
  keywords?: string[];
  avatar_url?: string;
  mobile?: string;
  created_at: string;
}

export interface House {
  id: string;
  name: string;
  state: string;
  country: string;
  zone: string;
  email?: string;
  mobile?: string;
  created_at: string;
  created_by?: string;
}

export interface Member {
  id: string;
  profile_id: string;
  house_id?: string;
  business?: string;
  industry?: string;
  keywords?: string[];
  joined_at: string;
  profile?: Profile;
  house?: House;
}

export interface Link {
  id: string;
  from_member_id: string;
  to_member_id: string;
  description: string;
  house_id?: string;
  created_by: string;
  created_at: string;
  from_member?: Profile;
  to_member?: Profile;
  house?: House;
}

export interface Deal {
  id: string;
  amount: number;
  from_member_id?: string;
  to_member_id?: string;
  description: string;
  house_id?: string;
  deal_date: string;
  created_by: string;
  created_at: string;
  from_member?: Profile;
  to_member?: Profile;
  house?: House;
}

export interface I2WEEvent {
  id: string;
  member_id: string;
  event_name: string;
  description?: string;
  event_date: string;
  created_by: string;
  created_at: string;
  member?: Profile;
}

export interface Attendance {
  id: string;
  event_name: string;
  member_id: string;
  marked_by: string;
  created_at: string;
  member?: Profile;
  marked_by_profile?: Profile;
}

export interface DashboardStats {
  houses: number;
  members: number;
  links: number;
  deals: number;
  i2we: number;
  attendance: number;
}
