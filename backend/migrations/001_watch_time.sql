create table if not exists public.video_watch_totals (
  user_id uuid not null references auth.users(id) on delete cascade,
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  watched_seconds bigint not null default 0 check (watched_seconds >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);

alter table public.video_watch_totals enable row level security;

create or replace function public.add_video_watch_seconds(
  p_user_id uuid,
  p_lesson_id uuid,
  p_seconds integer
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_seconds < 1 or p_seconds > 30 then
    raise exception 'seconds must be between 1 and 30';
  end if;

  insert into public.video_watch_totals (user_id, lesson_id, watched_seconds, updated_at)
  values (p_user_id, p_lesson_id, p_seconds, now())
  on conflict (user_id, lesson_id) do update
    set watched_seconds = public.video_watch_totals.watched_seconds + excluded.watched_seconds,
        updated_at = now();
end;
$$;

create or replace function public.total_watch_seconds()
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(watched_seconds), 0)::bigint
  from public.video_watch_totals;
$$;

revoke all on public.video_watch_totals from anon, authenticated;
revoke all on function public.add_video_watch_seconds(uuid, uuid, integer) from public, anon, authenticated;
revoke all on function public.total_watch_seconds() from public, anon, authenticated;
grant all on public.video_watch_totals to service_role;
grant execute on function public.add_video_watch_seconds(uuid, uuid, integer) to service_role;
grant execute on function public.total_watch_seconds() to service_role;
