-- NIMIPIKO — 0091: neutralize obsolete 'afternoon' category before 010's CHECK.
-- 010_missions_v2.sql (lines 35-36) adds
--   CHECK (category IN ('morning','movement','artistic','histoire',
--                       'zoom','discovery','flipflop','coloring'))
-- BEFORE its DELETE+reseed (line 49). The 2 'afternoon' seed rows left by
-- 008_fix_missions_1_per_step.sql violate the new CHECK -> SQLSTATE 23514 ->
-- fresh replay aborts at 010.
-- category is nullable (005); NULL passes CHECK. 010 deletes these rows and
-- reseeds anyway, so no mission data is lost. Idempotent; no-op on any DB
-- already past 010 (its own CHECK forbids 'afternoon').
UPDATE missions
SET category = NULL
WHERE category = 'afternoon';
