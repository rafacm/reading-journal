-- Replace the group creation RPC with a version that does not declare output
-- parameters named like table columns. PL/pgSQL treats RETURNS TABLE columns
-- as variables, which can make references such as id ambiguous.

DROP FUNCTION IF EXISTS create_group_with_owner(text, text, text);

CREATE FUNCTION create_group_with_owner(
  group_name text,
  group_description text DEFAULT NULL,
  group_avatar_url text DEFAULT NULL
)
RETURNS SETOF groups
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  new_group_id uuid := gen_random_uuid();
BEGIN
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  IF NULLIF(btrim(group_name), '') IS NULL THEN
    RAISE EXCEPTION 'Group name is required.';
  END IF;

  INSERT INTO profiles (id)
  VALUES (current_user_id)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO groups (id, name, description, avatar_url, created_by)
  VALUES (
    new_group_id,
    btrim(group_name),
    NULLIF(btrim(group_description), ''),
    NULLIF(btrim(group_avatar_url), ''),
    current_user_id
  );

  INSERT INTO group_memberships (group_id, user_id, role, status)
  VALUES (new_group_id, current_user_id, 'owner', 'active');

  RETURN QUERY
  SELECT g.*
  FROM groups AS g
  WHERE g.id = new_group_id;
END;
$$;

GRANT EXECUTE ON FUNCTION create_group_with_owner(text, text, text) TO authenticated;
