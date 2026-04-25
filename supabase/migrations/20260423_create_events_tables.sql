-- Events table
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  faction_id uuid not null references public.factions(id) on delete cascade,
  event_type_code text not null,
  title text not null,
  status text not null default 'draft',
  starts_at timestamp with time zone,
  ends_at timestamp with time zone,
  meta_json jsonb,
  faction_result_json jsonb,
  cover_url text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Event screenshots table
create table if not exists public.event_screenshots (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  storage_path text,
  uploaded_by uuid references auth.users(id) on delete set null,
  ocr_status text not null default 'queued',
  ocr_result_json jsonb,
  order_index int,
  created_at timestamp with time zone not null default now()
);

-- Event scores table
create table if not exists public.event_scores (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  member_id uuid not null references public.members(id) on delete cascade,
  rank_value int,
  points bigint,
  accept_current int,
  accept_max int,
  breakdown_json jsonb,
  raw_ocr_row_json jsonb,
  created_at timestamp with time zone not null default now(),
  unique(event_id, member_id)
);

-- Review queue table
create table if not exists public.review_queue (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  screenshot_id uuid references public.event_screenshots(id) on delete set null,
  raw_name text not null,
  candidates_json jsonb,
  resolution text,
  resolved_member_id uuid references public.members(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamp with time zone,
  raw_ocr_row_json jsonb,
  created_at timestamp with time zone not null default now()
);

-- Indexes
create index if not exists events_faction_id_idx on public.events(faction_id);
create index if not exists events_status_idx on public.events(status);
create index if not exists event_screenshots_event_id_idx on public.event_screenshots(event_id);
create index if not exists event_scores_event_id_idx on public.event_scores(event_id);
create index if not exists event_scores_member_id_idx on public.event_scores(member_id);
create index if not exists review_queue_event_id_idx on public.review_queue(event_id);
create index if not exists review_queue_resolution_idx on public.review_queue(resolution);

-- RLS Policies
alter table public.events enable row level security;
alter table public.event_screenshots enable row level security;
alter table public.event_scores enable row level security;
alter table public.review_queue enable row level security;

-- Events: Public read, owner/officer write
create policy "events_public_read" on public.events
  for select using (status = 'published');

create policy "events_officer_read" on public.events
  for select using (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id = events.faction_id 
      and platform_role in ('owner', 'officer')
    )
  );

create policy "events_officer_write" on public.events
  for insert with check (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id = new.faction_id 
      and platform_role in ('owner', 'officer')
    )
  );

create policy "events_officer_update" on public.events
  for update using (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id = events.faction_id 
      and platform_role in ('owner', 'officer')
    )
  );

-- Event screenshots: Officer read/write
create policy "event_screenshots_officer_read" on public.event_screenshots
  for select using (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id in (
        select faction_id from public.events where events.id = event_screenshots.event_id
      )
      and platform_role in ('owner', 'officer')
    )
  );

create policy "event_screenshots_officer_insert" on public.event_screenshots
  for insert with check (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id in (
        select faction_id from public.events where events.id = event_screenshots.event_id
      )
      and platform_role in ('owner', 'officer')
    )
  );

-- Event scores: Public read published, member/officer all
create policy "event_scores_public_read" on public.event_scores
  for select using (
    event_id in (select id from public.events where status = 'published')
  );

create policy "event_scores_member_read" on public.event_scores
  for select using (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id in (
        select faction_id from public.events where events.id = event_scores.event_id
      )
    )
  );

create policy "event_scores_officer_write" on public.event_scores
  for insert with check (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id in (
        select faction_id from public.events where events.id = event_scores.event_id
      )
      and platform_role in ('owner', 'officer')
    )
  );

-- Review queue: Officer only
create policy "review_queue_officer_read" on public.review_queue
  for select using (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id in (
        select faction_id from public.events where events.id = review_queue.event_id
      )
      and platform_role in ('owner', 'officer')
    )
  );

create policy "review_queue_officer_update" on public.review_queue
  for update using (
    auth.uid() in (
      select auth_user_id from public.profiles 
      where faction_id in (
        select faction_id from public.events where events.id = review_queue.event_id
      )
      and platform_role in ('owner', 'officer')
    )
  );
