-- ===================================================
-- BINDR — Supabase Database Schema
-- Run this in the Supabase SQL editor
-- ===================================================

-- ---- PROFILES ----
create table if not exists profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  account_type    text not null check (account_type in ('personal', 'corporate', 'student')),
  name            text not null,

  -- Personal / Student fields
  birthday        date,
  birth_year      int,
  salary          int,
  education       text,
  resume          text,
  cover_letter    text,
  searching_for   text,
  portfolio_urls  text[],

  -- Student-specific
  institution     text,
  grad_year       int,

  -- Corporate-specific
  year_founded    int,
  portfolio_url   text,
  contact_info    text,
  listings        jsonb,

  -- Shared
  avatar_url      text,
  created_at      timestamptz default now()
);

-- Row-level security
alter table profiles enable row level security;

create policy "Public profiles are viewable by authenticated users"
  on profiles for select using (auth.role() = 'authenticated');

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);


-- ---- SWIPES ----
create table if not exists swipes (
  id          uuid primary key default gen_random_uuid(),
  swiper_id   uuid references profiles(id) on delete cascade,
  target_id   uuid references profiles(id) on delete cascade,
  direction   text not null check (direction in ('left', 'right')),
  created_at  timestamptz default now(),
  unique (swiper_id, target_id)
);

alter table swipes enable row level security;

create policy "Users can insert their own swipes"
  on swipes for insert with check (auth.uid() = swiper_id);

create policy "Users can view swipes involving them"
  on swipes for select using (auth.uid() = swiper_id or auth.uid() = target_id);


-- ---- MATCHES ----
create table if not exists matches (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid references profiles(id) on delete cascade,
  user_b     uuid references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique (user_a, user_b)
);

alter table matches enable row level security;

create policy "Users can view their own matches"
  on matches for select using (auth.uid() = user_a or auth.uid() = user_b);

create policy "System can insert matches"
  on matches for insert with check (auth.uid() = user_a or auth.uid() = user_b);


-- ---- MESSAGES ----
create table if not exists messages (
  id          uuid primary key default gen_random_uuid(),
  sender_id   uuid references profiles(id) on delete cascade,
  receiver_id uuid references profiles(id) on delete cascade,
  content     text not null,
  created_at  timestamptz default now()
);

alter table messages enable row level security;

create policy "Users can send messages"
  on messages for insert with check (auth.uid() = sender_id);

create policy "Users can view their messages"
  on messages for select using (auth.uid() = sender_id or auth.uid() = receiver_id);

-- Enable realtime for messages
alter publication supabase_realtime add table messages;


-- ---- STORAGE BUCKETS ----
-- Run these in the Supabase Storage section or via SQL:
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict do nothing;
insert into storage.buckets (id, name, public) values ('portfolios', 'portfolios', true) on conflict do nothing;

-- Storage policies
create policy "Anyone can view avatars" on storage.objects for select using (bucket_id = 'avatars');
create policy "Authenticated users can upload avatars" on storage.objects for insert with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
create policy "Users can update own avatar" on storage.objects for update using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view portfolios" on storage.objects for select using (bucket_id = 'portfolios');
create policy "Authenticated users can upload portfolios" on storage.objects for insert with check (bucket_id = 'portfolios' and auth.role() = 'authenticated');
