-- Authentication setup and initial owner seeding
-- Redweyne as owner, ELS faction

-- =========== TRIGGER: AUTO-CREATE PROFILE ON SIGNUP ===========
CREATE OR REPLACE FUNCTION create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (
    auth_user_id,
    faction_id,
    platform_role,
    username,
    status
  )
  VALUES (
    NEW.id,
    (SELECT id FROM factions WHERE tag = 'ELS' LIMIT 1),
    'member',
    COALESCE(NEW.user_metadata->>'username', NEW.email),
    'pending'
  )
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users to auto-create profile
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION create_profile_on_signup();

-- =========== INITIAL DATA ===========
-- Note: The actual auth.users row for Redweyne must be created via Supabase Auth API or dashboard.
-- This migration only creates the profile entry. Run the following after creating the auth user:

-- INSERT INTO profiles (auth_user_id, faction_id, platform_role, username, display_name, status)
-- VALUES (
--   '<redweyne-auth-user-id>',
--   (SELECT id FROM factions WHERE tag = 'ELS'),
--   'owner',
--   'redweyne',
--   'Redweyne',
--   'active'
-- );

-- For testing/development, you can use this fixture (replace with real auth ID):
-- INSERT INTO profiles (auth_user_id, faction_id, platform_role, username, display_name, status)
-- SELECT
--   auth.uid(),
--   (SELECT id FROM factions WHERE tag = 'ELS'),
--   'owner',
--   'redweyne',
--   'Redweyne',
--   'active'
-- WHERE auth.uid() IS NOT NULL;
