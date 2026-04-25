-- Row-Level Security (RLS) policies for ELS Faction Tracker
-- Four roles: anon (public), member (authenticated), officer, owner

-- ========== ENABLE RLS ON ALL TABLES ==========
ALTER TABLE factions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- ========== HELPER FUNCTION: GET USER ROLE ==========
CREATE OR REPLACE FUNCTION get_user_platform_role()
RETURNS varchar AS $$
  SELECT platform_role FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

CREATE OR REPLACE FUNCTION get_user_faction_id()
RETURNS uuid AS $$
  SELECT faction_id FROM profiles
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL STABLE;

-- ========== FACTIONS TABLE POLICIES ==========
-- Anon/Members can read public factions
CREATE POLICY factions_public_read ON factions
  FOR SELECT
  USING (is_public = true);

-- Owner can do everything on their faction
CREATE POLICY factions_owner_all ON factions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.faction_id = factions.id
        AND profiles.auth_user_id = auth.uid()
        AND profiles.platform_role = 'owner'
    )
  );

-- ========== PROFILES TABLE POLICIES ==========
-- Members can read their own profile and other members' profiles in the same faction
CREATE POLICY profiles_read ON profiles
  FOR SELECT
  USING (
    auth.uid() IS NULL OR
    auth.uid() = auth_user_id OR
    (
      auth.uid() IS NOT NULL
      AND faction_id = get_user_faction_id()
      AND auth.uid() IN (SELECT auth_user_id FROM profiles WHERE platform_role IN ('owner', 'officer', 'member'))
    )
  );

-- Members can update their own profile
CREATE POLICY profiles_update_self ON profiles
  FOR UPDATE
  USING (auth.uid() = auth_user_id)
  WITH CHECK (auth.uid() = auth_user_id);

-- Owner can manage all profiles in their faction
CREATE POLICY profiles_owner_manage ON profiles
  FOR ALL
  USING (
    faction_id = get_user_faction_id()
    AND get_user_platform_role() = 'owner'
  );

-- ========== MEMBERS TABLE POLICIES ==========
-- Anon can read active members in public factions
CREATE POLICY members_anon_read ON members
  FOR SELECT
  USING (
    is_active = true
    AND faction_id IN (SELECT id FROM factions WHERE is_public = true)
  );

-- Members can read all members in their faction
CREATE POLICY members_faction_read ON members
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND faction_id = get_user_faction_id()
  );

-- Officers can insert/update/delete members in their faction
CREATE POLICY members_officer_manage ON members
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND faction_id = get_user_faction_id()
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- ========== MEMBER ALIASES TABLE POLICIES ==========
-- Anon can't read aliases
-- Members can read aliases in their faction
CREATE POLICY member_aliases_read ON member_aliases
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND member_id IN (
      SELECT id FROM members WHERE faction_id = get_user_faction_id()
    )
  );

-- Officers can manage aliases
CREATE POLICY member_aliases_officer_manage ON member_aliases
  FOR ALL
  USING (
    auth.uid() IS NOT NULL
    AND member_id IN (
      SELECT id FROM members WHERE faction_id = get_user_faction_id()
    )
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- ========== ACCOUNT REQUESTS TABLE POLICIES ==========
-- Anon can insert (signup requests)
CREATE POLICY account_requests_anon_insert ON account_requests
  FOR INSERT
  WITH CHECK (
    faction_id IN (SELECT id FROM factions WHERE is_public = true)
  );

-- Owner/officers can read and manage
CREATE POLICY account_requests_officer_read ON account_requests
  FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND faction_id = get_user_faction_id()
    AND get_user_platform_role() IN ('owner', 'officer')
  );

CREATE POLICY account_requests_officer_manage ON account_requests
  FOR UPDATE
  USING (
    auth.uid() IS NOT NULL
    AND faction_id = get_user_faction_id()
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- ========== EVENT TYPES TABLE POLICIES ==========
-- Everyone can read event types
CREATE POLICY event_types_read ON event_types
  FOR SELECT
  USING (true);

-- Owner/officers can manage
CREATE POLICY event_types_officer_manage ON event_types
  FOR ALL
  USING (
    get_user_platform_role() IN ('owner', 'officer')
  );

-- ========== EVENTS TABLE POLICIES ==========
-- Anon can read published events in public factions
CREATE POLICY events_anon_read ON events
  FOR SELECT
  USING (
    status = 'published'
    AND faction_id IN (SELECT id FROM factions WHERE is_public = true)
  );

-- Members can read published events in their faction
CREATE POLICY events_member_read ON events
  FOR SELECT
  USING (
    status = 'published'
    AND faction_id = get_user_faction_id()
  );

-- Officers can read all events (including draft/processing)
CREATE POLICY events_officer_read ON events
  FOR SELECT
  USING (
    faction_id = get_user_faction_id()
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- Officers can create/update/delete events
CREATE POLICY events_officer_manage ON events
  FOR ALL
  USING (
    faction_id = get_user_faction_id()
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- ========== EVENT SCREENSHOTS TABLE POLICIES ==========
-- Same as events
CREATE POLICY event_screenshots_anon_read ON event_screenshots
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE status = 'published'
        AND faction_id IN (SELECT id FROM factions WHERE is_public = true)
    )
  );

CREATE POLICY event_screenshots_officer_manage ON event_screenshots
  FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events WHERE faction_id = get_user_faction_id()
    )
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- Service role can bypass RLS for OCR workers (controlled at application level)

-- ========== EVENT SCORES TABLE POLICIES ==========
CREATE POLICY event_scores_anon_read ON event_scores
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events
      WHERE status = 'published'
        AND faction_id IN (SELECT id FROM factions WHERE is_public = true)
    )
  );

CREATE POLICY event_scores_member_read ON event_scores
  FOR SELECT
  USING (
    event_id IN (
      SELECT id FROM events WHERE faction_id = get_user_faction_id()
    )
  );

CREATE POLICY event_scores_officer_manage ON event_scores
  FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events WHERE faction_id = get_user_faction_id()
    )
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- ========== REVIEW QUEUE TABLE POLICIES ==========
-- Officers only
CREATE POLICY review_queue_officer_all ON review_queue
  FOR ALL
  USING (
    event_id IN (
      SELECT id FROM events WHERE faction_id = get_user_faction_id()
    )
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- ========== AUDIT LOG TABLE POLICIES ==========
-- Officers can read audit log for their faction
CREATE POLICY audit_log_officer_read ON audit_log
  FOR SELECT
  USING (
    faction_id = get_user_faction_id()
    AND get_user_platform_role() IN ('owner', 'officer')
  );

-- All authenticated users auto-log their actions (enforced at app level)
CREATE POLICY audit_log_insert ON audit_log
  FOR INSERT
  WITH CHECK (
    faction_id = get_user_faction_id()
  );
