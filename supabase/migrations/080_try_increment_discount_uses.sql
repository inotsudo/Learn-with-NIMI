-- Atomic CAS increment for discount code usage.
-- Returns true if the increment succeeded (code was under limit),
-- false if already at max_uses. PostgreSQL row-level locking guarantees
-- that two concurrent calls at the limit boundary only one will return true.
CREATE OR REPLACE FUNCTION try_increment_discount_uses(code_id_param uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows int;
BEGIN
  UPDATE discount_codes
  SET uses_count = uses_count + 1
  WHERE id = code_id_param
    AND (max_uses IS NULL OR uses_count < max_uses);
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows > 0;
END;
$$;
