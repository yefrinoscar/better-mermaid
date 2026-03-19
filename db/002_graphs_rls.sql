-- Enable RLS for graphs table
alter table if exists public.graphs enable row level security;

-- Avoid duplicate policy errors when re-running
drop policy if exists "graphs_select_own" on public.graphs;
drop policy if exists "graphs_insert_own" on public.graphs;
drop policy if exists "graphs_update_own" on public.graphs;
drop policy if exists "graphs_delete_own" on public.graphs;

-- Authenticated users can only access their own rows
create policy "graphs_select_own"
on public.graphs
for select
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "graphs_insert_own"
on public.graphs
for insert
to authenticated
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "graphs_update_own"
on public.graphs
for update
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id)
with check ((select auth.uid()) is not null and (select auth.uid()) = user_id);

create policy "graphs_delete_own"
on public.graphs
for delete
to authenticated
using ((select auth.uid()) is not null and (select auth.uid()) = user_id);
