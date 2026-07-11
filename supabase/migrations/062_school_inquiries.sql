-- School inquiry leads from /schools page
create table if not exists school_inquiries (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  school     text not null,
  email      text not null,
  country    text,
  learner_count text,
  message    text,
  status     text not null default 'new',  -- new | contacted | closed
  created_at timestamptz not null default now()
);

-- Only admins can read these
alter table school_inquiries enable row level security;

create policy "admins can manage school inquiries"
  on school_inquiries for all
  using (
    exists (
      select 1 from admin_users where id = auth.uid()
    )
  );

-- Service role (API) can always insert
create policy "service role can insert inquiries"
  on school_inquiries for insert
  with check (true);
