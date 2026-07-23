create table if not exists admin_settings (
  id         integer primary key default 1 check (id = 1),
  config     jsonb not null default '{}',
  updated_at timestamptz not null default now(),
  updated_by text
);

insert into admin_settings (id, config) values (1, '{
  "platformName": "NimiPiko",
  "tagline": "Stories. Adventures. Values for Life.",
  "supportEmail": "",
  "missionsPerStory": "6",
  "starsPerMission": "10",
  "autoUnlock": true,
  "introRequired": false,
  "pushNotifications": true,
  "dailyReminders": true,
  "achievementAlerts": true,
  "communityUpdates": false,
  "parentGate": true,
  "contentModeration": true,
  "dataEncryption": true
}') on conflict (id) do nothing;

alter table admin_settings enable row level security;

create policy "admins can read settings"
  on admin_settings for select
  using (true);

create policy "admins can update settings"
  on admin_settings for update
  using (true);
