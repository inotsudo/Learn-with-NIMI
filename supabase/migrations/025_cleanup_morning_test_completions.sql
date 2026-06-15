-- ============================================================
--  NIMIPIKO — 025: Clean up leftover "morning" test completions
--
--  While verifying the morning daily-rotation pool (migration 023),
--  all 3 morning missions were completed back-to-back via direct REST
--  calls against Ange's real account (113d8c38-a912-4739-97e9-c074feae65df)
--  purely to test the category_complete/mastery-badge mechanism. This
--  left her permanently "mastered" for the morning category (the gold
--  "🏆 Tu as maîtrisé Chanson du Matin !" banner shows on every visit),
--  which isn't representative of a real day-1 pilot state.
--
--  Remove those 3 test child_progress rows + the resulting badge.
-- ============================================================

delete from child_progress
where id in (
  '0b59801e-7748-4e67-9102-49119b6942a6', -- morning seq=1, test completion
  '02043108-34c1-46cf-a2a7-064e7793d2a8', -- morning seq=2, test completion
  'cd17bc55-b201-40bf-b6ed-14c8fd7664b3'  -- morning seq=3, test completion
);

delete from child_achievements
where id = 'bdecf114-c261-4488-86c2-2230024a2957'; -- morning-master-fr (premature)
