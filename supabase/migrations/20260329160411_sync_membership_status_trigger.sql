
/*
  # Sync membership_status trigger

  Adds a trigger on the profiles table so that whenever membership_status changes,
  users_profile is automatically updated with the matching membership_status and
  is_suspended value (FALSE when active, TRUE for all other statuses).
*/

CREATE OR REPLACE FUNCTION sync_membership_status_to_users_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.membership_status IS DISTINCT FROM OLD.membership_status THEN
    UPDATE users_profile
    SET
      membership_status = NEW.membership_status,
      is_suspended = (NEW.membership_status <> 'active')
    WHERE id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_membership_status ON profiles;

CREATE TRIGGER trg_sync_membership_status
AFTER UPDATE ON profiles
FOR EACH ROW
EXECUTE FUNCTION sync_membership_status_to_users_profile();
