create or replace function public.user_watch_seconds(p_user_id uuid)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(sum(watched_seconds), 0)::bigint
  from public.video_watch_totals
  where user_id = p_user_id;
$$;

revoke all on function public.user_watch_seconds(uuid) from public, anon, authenticated;
grant execute on function public.user_watch_seconds(uuid) to service_role;
