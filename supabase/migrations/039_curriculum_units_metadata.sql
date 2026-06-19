-- ============================================================
-- Migration 039: Curriculum Units — CMS metadata columns
--
-- Phase BK.3.1. Adds the remaining catalog fields for the
-- curriculum_units table (created empty in 038): a free-text
-- `description` and a CMS-only `status` (draft/active/archived)
-- used by the new admin "Units" tab (UnitManager.tsx) to plan the
-- Level -> Unit roadmap (up to 52 Units/Level). Purely additive —
-- not read by any progression RPC, no learner-facing effect.
-- ============================================================

alter table curriculum_units
  add column description text,
  add column status text not null default 'draft'
    check (status in ('draft', 'active', 'archived'));
