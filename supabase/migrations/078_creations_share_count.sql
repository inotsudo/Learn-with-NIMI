-- Add share_count to creations so shares survive deploys
alter table creations add column if not exists share_count integer not null default 0;
