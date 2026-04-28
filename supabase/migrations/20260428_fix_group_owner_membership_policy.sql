-- Allow the first owner membership to be inserted after a user creates a group.
-- Existing projects may still have the older insert policy that queried groups
-- through RLS, which blocks the bootstrap membership row.

CREATE OR REPLACE FUNCTION is_group_creator(group_uuid uuid, user_uuid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM groups
    WHERE id = group_uuid
      AND created_by = user_uuid
  );
$$;

DROP POLICY IF EXISTS "group_memberships: manager insert" ON group_memberships;

CREATE POLICY "group_memberships: manager insert" ON group_memberships
  FOR INSERT
  WITH CHECK (
    can_manage_group(group_id, auth.uid())
    OR (
      auth.uid() = user_id
      AND role = 'owner'
      AND status = 'active'
      AND is_group_creator(group_id, auth.uid())
    )
  );
