-- StreetVision AI — initial schema (SPEC.md section 2)
-- projects: um projeto = um local/intersecção sendo visualizado
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  name text not null,
  address text,
  -- foto inicial do local no bucket street-photos (SPEC route /projects/new)
  photo_path text,
  created_at timestamptz default now()
);

-- visualizations: cada geração de imagem dentro de um projeto
create table visualizations (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) not null,
  original_photo_path text not null,
  prompt text not null,
  generated_image_path text,
  cost_usd numeric(6,4) default 0.134,
  status text default 'pending',          -- pending | done | failed
  created_at timestamptz default now()
);

-- generation_limits: controle simples de cota diária por usuário
create table generation_limits (
  user_id uuid references auth.users(id) primary key,
  date date not null default current_date,
  count int not null default 0
);

-- RLS: cada usuário só enxerga/gerencia o que é dele
alter table projects enable row level security;
create policy "own projects" on projects
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

alter table visualizations enable row level security;
create policy "own visualizations" on visualizations
  for all using (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from projects p where p.id = project_id and p.user_id = auth.uid())
  );

alter table generation_limits enable row level security;
-- leitura do próprio contador (para exibir "X / 5" na UI);
-- escrita só pela Edge Function via service role (bypassa RLS)
create policy "read own limit" on generation_limits
  for select using (auth.uid() = user_id);

-- Storage: buckets privados, acesso via signed URL
insert into storage.buckets (id, name, public)
values ('street-photos', 'street-photos', false), ('generated-images', 'generated-images', false)
on conflict (id) do nothing;

-- objetos organizados por pasta do usuário: {user_id}/...
create policy "own street photos" on storage.objects
  for all using (
    bucket_id = 'street-photos' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'street-photos' and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "own generated images" on storage.objects
  for all using (
    bucket_id = 'generated-images' and (storage.foldername(name))[1] = auth.uid()::text
  ) with check (
    bucket_id = 'generated-images' and (storage.foldername(name))[1] = auth.uid()::text
  );
