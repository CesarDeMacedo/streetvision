-- Permite deletar usuários (ex: contas de teste no painel) sem "Database error
-- deleting user": as FKs originais não tinham ON DELETE CASCADE e bloqueavam a
-- exclusão. Cadeia: auth.users -> projects -> visualizations; generation_limits
-- pendura direto em auth.users.
-- Nota: arquivos no Storage não são apagados por cascade (ficam órfãos nos
-- buckets); limpeza manual se necessário.

alter table projects
  drop constraint projects_user_id_fkey,
  add constraint projects_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;

alter table visualizations
  drop constraint visualizations_project_id_fkey,
  add constraint visualizations_project_id_fkey
    foreign key (project_id) references projects(id) on delete cascade;

alter table generation_limits
  drop constraint generation_limits_user_id_fkey,
  add constraint generation_limits_user_id_fkey
    foreign key (user_id) references auth.users(id) on delete cascade;
