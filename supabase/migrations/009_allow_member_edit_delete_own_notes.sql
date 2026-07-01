-- Allow members to update their own task updates
create policy "Members can update their own task updates" on public.task_updates
  for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Allow members to delete their own task updates
create policy "Members can delete their own task updates" on public.task_updates
  for delete to authenticated
  using (auth.uid() = user_id);
