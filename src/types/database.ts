export type UserRole = 'band' | 'fan';

export interface SocialLinks {
  instagram?: string;
  spotify?: string;
  facebook?: string;
  website?: string;
}

export type ProfileStatus = 'pending' | 'approved' | 'rejected';

export interface Profile {
  id: string;
  role: UserRole;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  status: ProfileStatus;
  // Band-only
  genres: string[];
  social_links: SocialLinks;
  based_in: string | null;
  // Fan-only
  home_lat: number | null;
  home_lng: number | null;
  home_location_name: string | null;
  notification_radius_miles: number | null;
  created_at: string;
  updated_at: string;
}

export interface Gig {
  id: string;
  band_id: string;
  venue_name: string;
  lat: number;
  lng: number;
  genres: string[];
  starts_at: string;
  description: string | null;
  image_url: string | null;
  created_at: string;
  band?: Pick<Profile, 'id' | 'display_name' | 'avatar_url'>;
}

export interface Follow {
  fan_id: string;
  band_id: string;
  created_at: string;
}

export type FormState = { error?: string; message?: string } | null;
