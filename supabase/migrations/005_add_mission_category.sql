-- ============================================================
--  NIMIPIKO — Add category column to missions
-- ============================================================
ALTER TABLE missions ADD COLUMN IF NOT EXISTS category text;
