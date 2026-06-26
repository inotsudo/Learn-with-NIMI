-- Admin RPC to get all creations bypassing RLS
CREATE OR REPLACE FUNCTION admin_get_all_creations()
RETURNS TABLE (
  id uuid, child_name text, description text, image_url text,
  type text, is_public boolean, status text, likes bigint, created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.child_name, c.description, c.image_url,
    c.type, c.is_public, c.status,
    (SELECT count(*) FROM likes l WHERE l.creation_id = c.id) as likes,
    c.created_at
  FROM creations c
  WHERE EXISTS (SELECT 1 FROM admins WHERE id = auth.uid())
  ORDER BY c.created_at DESC;
$$;
