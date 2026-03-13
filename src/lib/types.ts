export interface Court {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  surface_type: 'asphalt' | 'concrete' | 'hardwood' | 'sport-court';
  image_url?: string;
  created_at: string;
}

export interface Profile {
  id: string;
  username: string;
  display_name?: string;
  avatar_url?: string;
  position?: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  height?: string;
  terms_accepted_at?: string;
  created_at: string;
}

export interface CheckIn {
  id: string;
  user_id: string;
  court_id: string;
  checked_in_at: string;
  expires_at: string;
  is_active: boolean;
}

export interface QueueEntry {
  id: string;
  user_id: string;
  court_id: string;
  position: number;
  status: 'waiting' | 'playing' | 'done';
  joined_at: string;
  profiles?: Profile;
}

export interface Game {
  id: string;
  court_id: string;
  game_type: '5v5' | '3v3' | '21' | '1v1';
  status: 'picking' | 'active' | 'finished';
  created_by: string;
  scorekeeper_id?: string;
  started_at?: string;
  ended_at?: string;
  created_at: string;
}

export interface GamePlayer {
  id: string;
  game_id: string;
  user_id: string;
  team: 1 | 2;
  is_captain: boolean;
  profiles?: Profile;
}

export interface GameStats {
  id: string;
  game_id: string;
  user_id: string;
  reported_by: string;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  three_pointers: number;
}

export interface StatVouch {
  id: string;
  game_id: string;
  stat_owner_id: string;
  voucher_id: string;
  approved: boolean;
}

export interface VerifiedStats {
  id: string;
  game_id: string;
  court_id: string;
  user_id: string;
  points: number;
  assists: number;
  rebounds: number;
  steals: number;
  blocks: number;
  three_pointers: number;
  verified_at: string;
}

export interface ScoreEvent {
  id: string;
  game_id: string;
  player_id: string;
  team: 1 | 2;
  score_type: '2pt' | '3pt' | 'ft';
  points: number;
  recorded_by: string;
  created_at: string;
}

export interface PickupSession {
  id: string;
  created_by: string;
  location_name: string;
  address: string;
  lat: number;
  lng: number;
  game_type: '5v5' | '3v3' | '1v1' | 'open';
  start_time: string;
  end_time: string;
  max_players?: number;
  description?: string;
  status: 'upcoming' | 'active' | 'ended';
  created_at: string;
  profiles?: Profile;
}

export interface CareerStats {
  user_id: string;
  games_played: number;
  ppg: number;
  apg: number;
  rpg: number;
  spg: number;
  bpg: number;
  tpg: number;
  total_points: number;
  total_assists: number;
  total_rebounds: number;
}
