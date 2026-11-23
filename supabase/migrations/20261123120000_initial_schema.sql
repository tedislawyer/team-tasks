-- TeamTasks: начална схема на базата данни

-- 1. Таблици
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.user_roles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'user'
    check (role in ('user', 'admin'))
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text not null default '',
  status text not null default 'todo'
    check (status in ('todo', 'in_progress', 'done')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.attachments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 2. Включване на RLS
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.attachments enable row level security;

-- 3. Профил и роля при регистрация
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));

  insert into public.user_roles (user_id, role)
  values (new.id, 'user');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 4. Правила за достъп (RLS)
create policy "Users can view own profile"
on public.profiles for select to authenticated
using ((select auth.uid()) = id);

create policy "Users can update own profile"
on public.profiles for update to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "Users can view own role"
on public.user_roles for select to authenticated
using ((select auth.uid()) = user_id);

create policy "Users can view own projects"
on public.projects for select to authenticated
using ((select auth.uid()) = owner_id);

create policy "Users can create own projects"
on public.projects for insert to authenticated
with check ((select auth.uid()) = owner_id);

create policy "Users can update own projects"
on public.projects for update to authenticated
using ((select auth.uid()) = owner_id)
with check ((select auth.uid()) = owner_id);

create policy "Users can delete own projects"
on public.projects for delete to authenticated
using ((select auth.uid()) = owner_id);

create policy "Project owners can manage tasks"
on public.tasks for all to authenticated
using (
  exists (
    select 1 from public.projects
    where projects.id = tasks.project_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1 from public.projects
    where projects.id = tasks.project_id
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Project owners can manage attachments"
on public.attachments for all to authenticated
using (
  exists (
    select 1
    from public.tasks
    join public.projects on projects.id = tasks.project_id
    where tasks.id = attachments.task_id
      and projects.owner_id = (select auth.uid())
  )
)
with check (
  exists (
    select 1
    from public.tasks
    join public.projects on projects.id = tasks.project_id
    where tasks.id = attachments.task_id
      and projects.owner_id = (select auth.uid())
  )
);

-- 5. Права за таблиците
grant select, insert, update, delete on table public.projects to authenticated;
grant select, insert, update, delete on table public.tasks to authenticated;
grant select, insert, delete on table public.attachments to authenticated;

-- 6. Частно хранилище за файлове
insert into storage.buckets (id, name, public)
values ('task-files', 'task-files', false)
on conflict (id) do nothing;

create policy "Task owners can read task files"
on storage.objects for select to authenticated
using (
  bucket_id = 'task-files'
  and exists (
    select 1
    from public.tasks
    join public.projects on projects.id = tasks.project_id
    where tasks.id::text = split_part(storage.objects.name, '/', 1)
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Task owners can upload task files"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'task-files'
  and exists (
    select 1
    from public.tasks
    join public.projects on projects.id = tasks.project_id
    where tasks.id::text = split_part(storage.objects.name, '/', 1)
      and projects.owner_id = (select auth.uid())
  )
);

create policy "Task owners can delete task files"
on storage.objects for delete to authenticated
using (
  bucket_id = 'task-files'
  and exists (
    select 1
    from public.tasks
    join public.projects on projects.id = tasks.project_id
    where tasks.id::text = split_part(storage.objects.name, '/', 1)
      and projects.owner_id = (select auth.uid())
  )
);

-- 7. Списък с потребители само за администратор
create or replace function public.admin_list_users()
returns table (id uuid, email text, full_name text, role text)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.user_roles ur
    where ur.user_id = (select auth.uid())
      and ur.role = 'admin'
  ) then
    raise exception 'Достъпът е разрешен само за администратор.';
  end if;

  return query
  select
    u.id,
    u.email::text,
    coalesce(p.full_name, ''),
    coalesce(r.role, 'user')
  from auth.users u
  left join public.profiles p on p.id = u.id
  left join public.user_roles r on r.user_id = u.id
  order by u.created_at desc;
end;
$$;

revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;
