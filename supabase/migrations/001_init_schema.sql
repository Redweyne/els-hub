-- Core schema initialization for ELS Faction Tracker
-- Phase 1: ELYSIUM flagship only; multi-tenant from day 1

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ========== FACTIONS TABLE ==========
CREATE TABLE factions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tag varchar(10) NOT NULL UNIQUE,
  name varchar(100) NOT NULL,
  server_no integer NOT NULL,
  class_tier varchar(10) NOT NULL,
  class_points integer,
  public_slug varchar(50) NOT NULL UNIQUE,
  theme_json jsonb DEFAULT '{}',
  is_public boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========== PROFILES TABLE ==========
CREATE TABLE profiles (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  faction_id uuid NOT NULL REFERENCES factions(id),
  platform_role varchar(20) NOT NULL CHECK (platform_role IN ('owner', 'officer', 'member', 'anon')),
  username varchar(30) NOT NULL,
  display_name varchar(100),
  linked_member_id uuid,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('pending', 'active', 'suspended')),
  recovery_email varchar(255),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(faction_id, username)
);

-- ========== MEMBERS TABLE ==========
CREATE TABLE members (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  faction_id uuid NOT NULL REFERENCES factions(id),
  canonical_name varchar(100) NOT NULL,
  player_id bigint,
  server_no integer,
  influence bigint,
  rank_tier varchar(20) NOT NULL CHECK (rank_tier IN ('mastermind', 'leaders', 'frontliner', 'production', 'stranger')),
  family_role varchar(20) CHECK (family_role IN ('advisor', 'general', 'diplomat', 'coordinator')),
  vip_level integer,
  avatar_url varchar(500),
  titles text[] DEFAULT '{}',
  joined_at date,
  left_at date,
  is_active boolean DEFAULT true,
  claimed_by_profile_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(faction_id, canonical_name)
);

-- ========== MEMBER ALIASES TABLE ==========
CREATE TABLE member_aliases (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  alias varchar(100) NOT NULL,
  source varchar(20) NOT NULL CHECK (source IN ('ocr', 'manual', 'seed')),
  confidence decimal(3,2),
  last_seen timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(member_id, alias)
);

-- ========== ACCOUNT REQUESTS TABLE ==========
CREATE TABLE account_requests (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  faction_id uuid NOT NULL REFERENCES factions(id),
  claimed_member_id uuid REFERENCES members(id),
  username_requested varchar(30) NOT NULL,
  password_hash varchar(255) NOT NULL,
  display_name_requested varchar(100),
  recovery_email varchar(255),
  proof_screenshot_path varchar(500),
  extracted_player_id bigint,
  extracted_name varchar(100),
  extracted_vip_level integer,
  ip_address varchar(45),
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamp with time zone,
  reviewer_notes text,
  submitted_at timestamp with time zone DEFAULT now(),
  UNIQUE(faction_id, username_requested)
);

-- ========== EVENT TYPES TABLE ==========
CREATE TABLE event_types (
  code varchar(20) PRIMARY KEY,
  name varchar(100) NOT NULL,
  columns_json jsonb NOT NULL,
  ocr_prompt text,
  result_template jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- ========== EVENTS TABLE ==========
CREATE TABLE events (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  faction_id uuid NOT NULL REFERENCES factions(id),
  event_type_code varchar(20) NOT NULL REFERENCES event_types(code),
  title varchar(255) NOT NULL,
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  status varchar(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'processing', 'published')),
  meta_json jsonb DEFAULT '{}',
  faction_result_json jsonb,
  cover_url varchar(500),
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========== EVENT SCREENSHOTS TABLE ==========
CREATE TABLE event_screenshots (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  storage_path varchar(500) NOT NULL,
  uploaded_by uuid NOT NULL REFERENCES profiles(id),
  ocr_status varchar(20) NOT NULL DEFAULT 'queued' CHECK (ocr_status IN ('queued', 'processing', 'done', 'failed')),
  ocr_result_json jsonb,
  order_index integer,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ========== EVENT SCORES TABLE ==========
CREATE TABLE event_scores (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id uuid NOT NULL REFERENCES members(id),
  rank_value integer,
  points bigint,
  accept_current boolean,
  accept_max boolean,
  breakdown_json jsonb,
  raw_ocr_row_json jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(event_id, member_id)
);

-- ========== REVIEW QUEUE TABLE ==========
CREATE TABLE review_queue (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  screenshot_id uuid NOT NULL REFERENCES event_screenshots(id),
  raw_name varchar(100) NOT NULL,
  candidates_json jsonb,
  resolution varchar(20) CHECK (resolution IN ('matched', 'new_member', 'rival', 'ignored')),
  resolved_member_id uuid REFERENCES members(id),
  resolved_by uuid REFERENCES profiles(id),
  resolved_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- ========== AUDIT LOG TABLE ==========
CREATE TABLE audit_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  faction_id uuid NOT NULL REFERENCES factions(id),
  actor_id uuid NOT NULL REFERENCES profiles(id),
  action varchar(50) NOT NULL,
  target_table varchar(50),
  target_id uuid,
  diff_json jsonb,
  created_at timestamp with time zone DEFAULT now()
);

-- ========== INDEXES ==========
CREATE INDEX idx_profiles_faction_id ON profiles(faction_id);
CREATE INDEX idx_profiles_auth_user_id ON profiles(auth_user_id);
CREATE INDEX idx_members_faction_id ON members(faction_id);
CREATE INDEX idx_members_rank_tier ON members(rank_tier);
CREATE INDEX idx_member_aliases_member_id ON member_aliases(member_id);
CREATE INDEX idx_member_aliases_alias ON member_aliases(alias);
CREATE INDEX idx_account_requests_faction_id ON account_requests(faction_id);
CREATE INDEX idx_account_requests_status ON account_requests(status);
CREATE INDEX idx_events_faction_id ON events(faction_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_event_screenshots_event_id ON event_screenshots(event_id);
CREATE INDEX idx_event_scores_event_id ON event_scores(event_id);
CREATE INDEX idx_event_scores_member_id ON event_scores(member_id);
CREATE INDEX idx_review_queue_event_id ON review_queue(event_id);
CREATE INDEX idx_audit_log_faction_id ON audit_log(faction_id);
CREATE INDEX idx_audit_log_actor_id ON audit_log(actor_id);
