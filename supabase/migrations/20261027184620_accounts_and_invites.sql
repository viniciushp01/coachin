-- =====================================================================
-- Coach In · 0001 · Contas, papéis, vínculos aluno-professor e convites
-- Regras de produto: 39, 46, 79, 82, 83, 87 a 98, 100, 102, 108, 119 a 121
--
-- Princípios desta migration (valem para as seguintes):
--  * RLS em todas as tabelas. O app só LÊ tabelas; toda ESCRITA passa por
--    funções (RPC) que conferem papel, dono e regras de negócio no servidor.
--  * O papel (admin/professor/aluno) fica em public.profiles, nunca em
--    user_metadata (que o próprio usuário consegue editar).
--  * Mensagens de erro das funções são CÓDIGOS (ex.: 'invite_expired'); o app
--    traduz para pt-BR.
-- =====================================================================

create extension if not exists pgcrypto with schema extensions;
create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm  with schema extensions;

-- Schema interno: funções auxiliares que NÃO viram endpoint da API.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------
-- Tipos
-- ---------------------------------------------------------------------
create type public.app_role       as enum ('admin', 'professor', 'aluno');
create type public.account_status as enum ('active', 'blocked');
-- invited  = cadastro feito pelo professor, ainda sem conta vinculada
-- active   = aluno vinculado (no máximo 1 por conta)
-- archived = vínculo encerrado (troca de professor ou conta virou professor)
create type public.link_status    as enum ('invited', 'active', 'archived');
create type public.invite_kind    as enum ('student', 'teacher');
create type public.invite_status  as enum ('pending', 'accepted', 'declined', 'replaced');

-- ---------------------------------------------------------------------
-- Utilitários
-- ---------------------------------------------------------------------
create or replace function private.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create or replace function private.norm_email(p text) returns text
language sql immutable as $$
  select nullif(lower(btrim(coalesce(p, ''))), '')
$$;

create or replace function private.email_valid(p text) returns boolean
language sql immutable as $$
  select p ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
$$;

create or replace function private.phone_valid(p text) returns boolean
language sql immutable as $$
  select p ~ '^\+[0-9]{10,15}$'
$$;

create or replace function private.new_token() returns text
language sql volatile as $$
  select encode(extensions.gen_random_bytes(32), 'hex')
$$;

create or replace function private.hash_token(p text) returns text
language sql immutable as $$
  select encode(extensions.digest(coalesce(p, ''), 'sha256'), 'hex')
$$;

-- ---------------------------------------------------------------------
-- profiles: uma linha por conta (auth.users). Um e-mail = um papel (regra 87).
-- ---------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  email      text not null check (email = lower(email)),
  role       public.app_role not null default 'aluno',
  status     public.account_status not null default 'active',
  full_name  text not null default '',
  timezone   text not null default 'America/Sao_Paulo',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_email_key on public.profiles (email);
create index profiles_role_idx on public.profiles (role);

create trigger profiles_touch before update on public.profiles
  for each row execute function private.touch_updated_at();

-- Toda conta nova nasce como aluno sem professor (regras 89 e 90).
-- O administrador é criado FORA do app (ver comentário no fim do arquivo).
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    lower(new.email),
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''), '')
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------
-- Helpers de acesso (usados nas políticas)
-- ---------------------------------------------------------------------
-- Papel da conta logada; NULL se não houver sessão ou se a conta estiver
-- bloqueada. Por isso toda política que exige um papel já nega contas
-- bloqueadas (regras 95 e 119).
create or replace function private.my_role() returns public.app_role
language sql stable security definer set search_path = public as $$
  select p.role from public.profiles p
  where p.id = auth.uid() and p.status = 'active'
$$;

-- "Hoje" no fuso da conta (regra 115).
create or replace function private.user_today(p_user uuid) returns date
language sql stable security definer set search_path = public as $$
  select (now() at time zone coalesce(
            (select p.timezone from public.profiles p where p.id = p_user),
            'America/Sao_Paulo'))::date
$$;

-- "Hoje" no fuso do aluno de um vínculo (sem conta ainda: fuso padrão).
-- (plpgsql: a tabela students só é criada mais abaixo.)
create or replace function private.student_today(p_student uuid) returns date
language plpgsql stable security definer set search_path = public as $$
begin
  return (now() at time zone coalesce(
            (select p.timezone from public.students s
               join public.profiles p on p.id = s.user_id
              where s.id = p_student),
            'America/Sao_Paulo'))::date;
end $$;

create or replace function private.invite_state(p_status public.invite_status, p_expires timestamptz)
returns text language sql stable as $$
  select case when p_status = 'pending' and p_expires <= now() then 'expired'
              else p_status::text end
$$;

-- ---------------------------------------------------------------------
-- students: o vínculo aluno-professor. Nasce no cadastro feito pelo
-- professor (sem conta), vira 'active' quando o aluno aceita o convite e
-- vira 'archived' ao trocar de professor (regra 98, decidido em 27/10:
-- ARQUIVAR, não apagar). Todo dado de treino pendura aqui.
-- ---------------------------------------------------------------------
create table public.students (
  id             uuid primary key default gen_random_uuid(),
  teacher_id     uuid not null references public.profiles (id) on delete restrict,
  user_id        uuid references public.profiles (id) on delete cascade,
  name           text not null check (length(btrim(name)) > 0),
  email          text check (email is null or email = lower(email)),
  phone          text check (phone is null or phone ~ '^\+[0-9]{10,15}$'),
  status         public.link_status not null default 'invited',
  linked_at      timestamptz,
  archived_at    timestamptz,
  archive_reason text check (archive_reason in ('teacher_switch', 'became_teacher')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (id, teacher_id),
  check ((status = 'invited' and user_id is null)
      or (status in ('active', 'archived') and user_id is not null)),
  check ((status = 'archived') = (archived_at is not null))
);
create index students_teacher_idx on public.students (teacher_id) where status <> 'archived';
create index students_user_idx on public.students (user_id);
-- Um aluno tem um professor por vez (regra 98).
create unique index students_one_active_link_per_user
  on public.students (user_id) where status = 'active';

create trigger students_touch before update on public.students
  for each row execute function private.touch_updated_at();

create or replace function private.is_teacher_of_user(p_user uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(
    private.my_role() = 'professor'
    and exists (select 1 from public.students s
                 where s.user_id = p_user
                   and s.teacher_id = auth.uid()
                   and s.status = 'active'),
    false)
$$;

create or replace function private.is_teacher_of_me(p_teacher uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.students s
                  where s.user_id = auth.uid() and s.teacher_id = p_teacher)
$$;

-- Vínculo ativo da conta logada (aluno), ou NULL.
create or replace function private.my_active_link() returns uuid
language sql stable security definer set search_path = public as $$
  select s.id from public.students s
   where s.user_id = auth.uid() and s.status = 'active'
$$;

-- Mantém o nome do vínculo ativo em sincronia com o nome do perfil e
-- valida o fuso horário.
create or replace function private.on_profile_update() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.timezone is distinct from old.timezone
     and not exists (select 1 from pg_timezone_names n where n.name = new.timezone) then
    raise exception 'timezone_invalid';
  end if;
  if new.full_name is distinct from old.full_name then
    if btrim(new.full_name) = '' and btrim(old.full_name) <> '' then
      raise exception 'name_required';
    end if;
    new.full_name := btrim(new.full_name);
    if new.full_name <> '' then
      update public.students set name = new.full_name
       where user_id = new.id and status = 'active';
    end if;
  end if;
  return new;
end $$;

create trigger profiles_before_update before update on public.profiles
  for each row execute function private.on_profile_update();

-- ---------------------------------------------------------------------
-- Perfil do aluno (regras 49, 85, 99, 108) + histórico de edições (regra 42).
-- Pertence à CONTA, não ao vínculo: trocar de professor não refaz o perfil.
-- ---------------------------------------------------------------------
create table public.student_profiles (
  user_id            uuid primary key references public.profiles (id) on delete cascade,
  birth_date         date,
  phone              text check (phone is null or phone ~ '^\+[0-9]{10,15}$'),
  height_m           numeric(3, 2) check (height_m is null or height_m between 1.00 and 2.50),
  weight_kg          numeric(5, 2) check (weight_kg is null or weight_kg between 20 and 300),
  restrictions       text,
  notice_accepted_at timestamptz,   -- passo 1 do primeiro acesso
  completed_at       timestamptz,   -- passo 2 concluído
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (completed_at is null or (birth_date is not null and phone is not null
                                   and height_m is not null and weight_kg is not null))
);
create trigger student_profiles_touch before update on public.student_profiles
  for each row execute function private.touch_updated_at();

create table public.student_profile_changes (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  field      text not null,
  old_value  text,
  new_value  text,
  changed_at timestamptz not null default now()
);
create index student_profile_changes_idx on public.student_profile_changes (user_id, field, changed_at desc);

create or replace function private.log_student_profile_changes() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  f text;
  o text;
  n text;
begin
  foreach f in array array['birth_date', 'phone', 'height_m', 'weight_kg', 'restrictions'] loop
    n := to_jsonb(new) ->> f;
    o := case when tg_op = 'UPDATE' then to_jsonb(old) ->> f else null end;
    if n is distinct from o then
      insert into public.student_profile_changes (user_id, field, old_value, new_value)
      values (new.user_id, f, o, n);
    end if;
  end loop;
  return new;
end $$;

create trigger student_profiles_log
  after insert or update on public.student_profiles
  for each row execute function private.log_student_profile_changes();

-- ---------------------------------------------------------------------
-- invites: convites de aluno (7 dias) e de professor (1 dia). Uso único.
-- O token só existe em texto puro na resposta da função que o cria;
-- no banco fica apenas o hash.
-- ---------------------------------------------------------------------
create table public.invites (
  id           uuid primary key default gen_random_uuid(),
  kind         public.invite_kind not null,
  token_hash   text not null unique,
  inviter_id   uuid not null references public.profiles (id) on delete cascade,
  student_id   uuid references public.students (id) on delete cascade,
  email        text check (email is null or email = lower(email)),
  invitee_name text,
  status       public.invite_status not null default 'pending',
  expires_at   timestamptz not null,
  accepted_at  timestamptz,
  accepted_by  uuid references public.profiles (id) on delete set null,
  declined_at  timestamptz,
  replaced_at  timestamptz,
  created_at   timestamptz not null default now(),
  check ((kind = 'student' and student_id is not null)
      or (kind = 'teacher' and student_id is null and email is not null
          and invitee_name is not null))
);
create unique index invites_one_pending_per_student
  on public.invites (student_id) where status = 'pending';
create unique index invites_one_pending_per_teacher_email
  on public.invites (email) where kind = 'teacher' and status = 'pending';
create index invites_inviter_idx on public.invites (inviter_id, created_at desc);
create index invites_student_idx on public.invites (student_id, created_at desc);

-- ---------------------------------------------------------------------
-- RLS: leitura por papel. Nenhuma escrita direta (ver grants).
-- ---------------------------------------------------------------------
alter table public.profiles                enable row level security;
alter table public.students                enable row level security;
alter table public.student_profiles        enable row level security;
alter table public.student_profile_changes enable row level security;
alter table public.invites                 enable row level security;

-- profiles: a própria conta (inclusive bloqueada, para mostrar a tela de
-- bloqueio); o professor vê os alunos vinculados; o aluno vê seus
-- professores (atuais e antigos); o administrador vê só professores.
create policy profiles_select_own on public.profiles
  for select to authenticated using (id = auth.uid());
create policy profiles_select_my_students on public.profiles
  for select to authenticated using (private.is_teacher_of_user(id));
create policy profiles_select_my_teachers on public.profiles
  for select to authenticated
  using (private.my_role() = 'aluno' and private.is_teacher_of_me(id));
create policy profiles_select_teachers_for_admin on public.profiles
  for select to authenticated
  using (private.my_role() = 'admin' and role = 'professor');
create policy profiles_update_own on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

-- students: professor vê os seus (menos arquivados: "deixa de ver o aluno",
-- regra 98); aluno vê os próprios, inclusive arquivados (histórico dele).
-- O administrador NÃO tem política aqui: não vê dados de alunos (regra 87).
create policy students_select_teacher on public.students
  for select to authenticated
  using (private.my_role() = 'professor' and teacher_id = auth.uid() and status <> 'archived');
create policy students_select_self on public.students
  for select to authenticated
  using (private.my_role() = 'aluno' and user_id = auth.uid());

create policy student_profiles_select_own on public.student_profiles
  for select to authenticated
  using (user_id = auth.uid() and private.my_role() = 'aluno');
create policy student_profiles_select_teacher on public.student_profiles
  for select to authenticated using (private.is_teacher_of_user(user_id));

create policy student_profile_changes_select_own on public.student_profile_changes
  for select to authenticated
  using (user_id = auth.uid() and private.my_role() = 'aluno');

create policy invites_select_teacher on public.invites
  for select to authenticated
  using (kind = 'student' and inviter_id = auth.uid() and private.my_role() = 'professor');
create policy invites_select_admin on public.invites
  for select to authenticated
  using (kind = 'teacher' and private.my_role() = 'admin');

-- ---------------------------------------------------------------------
-- Privilégios de tabela: só leitura (e 2 colunas do próprio perfil).
-- O Supabase concede tudo por padrão; aqui retiramos explicitamente.
-- ---------------------------------------------------------------------
revoke all on public.profiles, public.students, public.student_profiles,
              public.student_profile_changes, public.invites
  from anon, authenticated;
grant select on public.profiles, public.students, public.student_profiles,
                public.student_profile_changes, public.invites
  to authenticated;
grant update (full_name, timezone) on public.profiles to authenticated;

-- ---------------------------------------------------------------------
-- Funções públicas (RPC)
-- ---------------------------------------------------------------------

-- Convite: pré-visualização para a tela de convite (aceita sem login).
-- Devolve só o necessário; o token (256 bits) é o segredo.
create or replace function public.get_invite_preview(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v public.invites%rowtype;
  v_state text;
  v_inviter text;
  v_name text;
begin
  select * into v from public.invites where token_hash = private.hash_token(p_token);
  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;
  v_state := private.invite_state(v.status, v.expires_at);
  select p.full_name into v_inviter from public.profiles p where p.id = v.inviter_id;
  if v.kind = 'student' then
    select s.name into v_name from public.students s where s.id = v.student_id;
  else
    v_name := v.invitee_name;
  end if;
  return jsonb_build_object(
    'state', case v_state when 'pending' then 'valid'
                          when 'accepted' then 'used'
                          else v_state end,
    'kind', v.kind,
    'inviter_name', v_inviter,
    'invitee_name', v_name,
    'email', v.email,
    'account_exists', case when v.email is null then null
                           else exists (select 1 from public.profiles p where p.email = v.email) end,
    'expires_at', v.expires_at
  );
end $$;

-- Professor: cadastra o aluno e já gera o convite (regras 57 e 58).
create or replace function public.create_student_with_invite(
  p_name text, p_email text default null, p_phone text default null
) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text := btrim(coalesce(p_name, ''));
  v_email text := private.norm_email(p_email);
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_student uuid;
  v_token text := private.new_token();
  v_inv   uuid;
  v_exp   timestamptz := now() + interval '7 days';
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  if v_name = '' then raise exception 'name_required'; end if;
  if v_email is not null and not private.email_valid(v_email) then raise exception 'email_invalid'; end if;
  if v_phone is not null and not private.phone_valid(v_phone) then raise exception 'phone_invalid'; end if;
  if v_email is not null and exists (
       select 1 from public.students s
        where s.teacher_id = v_uid and s.email = v_email and s.status <> 'archived') then
    raise exception 'student_email_taken';
  end if;

  insert into public.students (teacher_id, name, email, phone)
  values (v_uid, v_name, v_email, v_phone) returning id into v_student;

  insert into public.invites (kind, token_hash, inviter_id, student_id, email, expires_at)
  values ('student', private.hash_token(v_token), v_uid, v_student, v_email, v_exp)
  returning id into v_inv;

  return jsonb_build_object('student_id', v_student, 'invite_id', v_inv,
                            'token', v_token, 'expires_at', v_exp);
end $$;

-- Reenviar / gerar novo / corrigir e-mail (regras 58 e 102). O link anterior
-- deixa de valer. Vale para convite de aluno (professor dono) e de professor
-- (administrador).
create or replace function public.reissue_invite(p_invite_id uuid, p_new_email text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v       public.invites%rowtype;
  v_state text;
  v_email text := private.norm_email(p_new_email);
  v_st    public.students%rowtype;
  v_ttl   interval;
  v_token text := private.new_token();
  v_id    uuid;
  v_exp   timestamptz;
  v_target_email text;
begin
  select * into v from public.invites where id = p_invite_id for update;
  if not found then raise exception 'invite_not_found'; end if;
  if v_email is not null and not private.email_valid(v_email) then raise exception 'email_invalid'; end if;
  v_state := private.invite_state(v.status, v.expires_at);

  if v.kind = 'student' then
    if private.my_role() is distinct from 'professor' or v.inviter_id <> v_uid then
      raise exception 'forbidden';
    end if;
    select * into v_st from public.students where id = v.student_id for update;
    if v_st.status <> 'invited' then raise exception 'student_already_linked'; end if;
    v_ttl := interval '7 days';
    v_target_email := coalesce(v_email, v.email);
  else
    if private.my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
    v_ttl := interval '1 day';
    v_target_email := coalesce(v_email, v.email);
  end if;

  if v_state = 'accepted' then raise exception 'invite_used'; end if;
  if v_state = 'replaced' then raise exception 'invite_replaced'; end if;

  if v_email is not null and v_email is distinct from v.email then
    if v.kind = 'student' then
      if exists (select 1 from public.students s
                  where s.teacher_id = v_uid and s.email = v_email
                    and s.status <> 'archived' and s.id <> v_st.id) then
        raise exception 'student_email_taken';
      end if;
      update public.students set email = v_email where id = v_st.id;
    else
      if exists (select 1 from public.profiles p where p.email = v_email and p.role = 'admin') then
        raise exception 'email_is_admin';
      end if;
      if exists (select 1 from public.profiles p where p.email = v_email and p.role = 'professor') then
        raise exception 'already_teacher';
      end if;
    end if;
  end if;

  -- pendente ou vencido: o link antigo deixa de valer. Recusado fica como
  -- histórico ("Recusou o convite em dd/mm").
  if v_state in ('pending', 'expired') then
    update public.invites set status = 'replaced', replaced_at = now() where id = v.id;
  end if;

  v_exp := now() + v_ttl;
  insert into public.invites (kind, token_hash, inviter_id, student_id, email, invitee_name, expires_at)
  values (v.kind, private.hash_token(v_token), v.inviter_id, v.student_id,
          v_target_email, v.invitee_name, v_exp)
  returning id into v_id;

  return jsonb_build_object('invite_id', v_id, 'token', v_token, 'expires_at', v_exp);
end $$;

-- Administrador: convida um professor (regras 92 e 93). Link de 1 dia.
create or replace function public.create_teacher_invite(p_name text, p_email text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text := btrim(coalesce(p_name, ''));
  v_email text := private.norm_email(p_email);
  v_token text := private.new_token();
  v_id    uuid;
  v_exp   timestamptz := now() + interval '1 day';
begin
  if private.my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if v_name = '' then raise exception 'name_required'; end if;
  if v_email is null or not private.email_valid(v_email) then raise exception 'email_invalid'; end if;
  if exists (select 1 from public.profiles p where p.email = v_email and p.role = 'admin') then
    raise exception 'email_is_admin';
  end if;
  if exists (select 1 from public.profiles p where p.email = v_email and p.role = 'professor') then
    raise exception 'already_teacher';
  end if;

  update public.invites set status = 'replaced', replaced_at = now()
   where kind = 'teacher' and email = v_email and status = 'pending';

  insert into public.invites (kind, token_hash, inviter_id, email, invitee_name, expires_at)
  values ('teacher', private.hash_token(v_token), v_uid, v_email, v_name, v_exp)
  returning id into v_id;

  return jsonb_build_object('invite_id', v_id, 'token', v_token, 'expires_at', v_exp);
end $$;

-- Aluno: aceita o convite e vincula a conta ao professor (regras 79, 97, 98).
-- Se já tem professor, exige confirmação explícita; o vínculo antigo é
-- ARQUIVADO (o aluno continua vendo o histórico; o professor antigo não).
create or replace function public.accept_student_invite(p_token text, p_confirm_switch boolean default false)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid    uuid := auth.uid();
  v_prof   public.profiles%rowtype;
  v_conf   timestamptz;
  v        public.invites%rowtype;
  v_state  text;
  v_st     public.students%rowtype;
  v_cur    public.students%rowtype;
  v_teacher_status public.account_status;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_prof from public.profiles where id = v_uid;
  if v_prof.status = 'blocked' then raise exception 'account_blocked'; end if;
  if v_prof.role <> 'aluno' then raise exception 'role_not_allowed'; end if;
  select u.email_confirmed_at into v_conf from auth.users u where u.id = v_uid;
  if v_conf is null then raise exception 'email_not_confirmed'; end if;

  select * into v from public.invites
   where token_hash = private.hash_token(p_token) and kind = 'student' for update;
  if not found then raise exception 'invite_invalid'; end if;
  v_state := private.invite_state(v.status, v.expires_at);
  if v_state = 'replaced' then raise exception 'invite_replaced'; end if;
  if v_state = 'accepted' then raise exception 'invite_used'; end if;
  if v_state = 'declined' then raise exception 'invite_declined'; end if;
  if v_state = 'expired'  then raise exception 'invite_expired'; end if;

  select * into v_st from public.students where id = v.student_id for update;
  if v_st.status <> 'invited' then raise exception 'invite_used'; end if;
  select p.status into v_teacher_status from public.profiles p where p.id = v_st.teacher_id;
  if v_teacher_status <> 'active' then raise exception 'teacher_unavailable'; end if;

  select * into v_cur from public.students
   where user_id = v_uid and status = 'active' for update;
  if found then
    if v_cur.teacher_id = v_st.teacher_id then raise exception 'already_linked'; end if;
    if not coalesce(p_confirm_switch, false) then raise exception 'switch_requires_confirmation'; end if;
    update public.students
       set status = 'archived', archived_at = now(), archive_reason = 'teacher_switch'
     where id = v_cur.id;
  end if;

  update public.students
     set user_id = v_uid, status = 'active', linked_at = now()
   where id = v_st.id;
  update public.invites
     set status = 'accepted', accepted_at = now(), accepted_by = v_uid
   where id = v.id;

  return jsonb_build_object(
    'student_id', v_st.id,
    'teacher_id', v_st.teacher_id,
    'switched', v_cur.id is not null,
    'needs_first_access', not exists (
        select 1 from public.student_profiles sp
         where sp.user_id = v_uid and sp.completed_at is not null)
  );
end $$;

-- Conta existente vira professor (regras 87 e 93). O e-mail da conta precisa
-- ser o do convite e estar confirmado. Se era aluno, o vínculo é arquivado:
-- os dados ficam guardados, sem acesso.
create or replace function public.accept_teacher_invite(p_token text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v_prof  public.profiles%rowtype;
  v_email text;
  v_conf  timestamptz;
  v       public.invites%rowtype;
  v_state text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v_prof from public.profiles where id = v_uid;
  if v_prof.status = 'blocked' then raise exception 'account_blocked'; end if;
  if v_prof.role = 'admin' then raise exception 'role_not_allowed'; end if;
  if v_prof.role = 'professor' then raise exception 'already_teacher'; end if;
  select lower(u.email), u.email_confirmed_at into v_email, v_conf from auth.users u where u.id = v_uid;
  if v_conf is null then raise exception 'email_not_confirmed'; end if;

  select * into v from public.invites
   where token_hash = private.hash_token(p_token) and kind = 'teacher' for update;
  if not found then raise exception 'invite_invalid'; end if;
  v_state := private.invite_state(v.status, v.expires_at);
  if v_state = 'replaced' then raise exception 'invite_replaced'; end if;
  if v_state = 'accepted' then raise exception 'invite_used'; end if;
  if v_state = 'declined' then raise exception 'invite_declined'; end if;
  if v_state = 'expired'  then raise exception 'invite_expired'; end if;
  if v_email is distinct from v.email then raise exception 'email_mismatch'; end if;

  update public.students
     set status = 'archived', archived_at = now(), archive_reason = 'became_teacher'
   where user_id = v_uid and status = 'active';

  update public.profiles
     set role = 'professor',
         full_name = case when btrim(full_name) = '' then v.invitee_name else full_name end
   where id = v_uid;

  update public.invites
     set status = 'accepted', accepted_at = now(), accepted_by = v_uid
   where id = v.id;

  return jsonb_build_object('role', 'professor');
end $$;

-- "Agora não" (regra 102): o convite expira na hora e aparece como recusado.
create or replace function public.decline_invite(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v       public.invites%rowtype;
  v_email text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  select * into v from public.invites where token_hash = private.hash_token(p_token) for update;
  if not found then raise exception 'invite_invalid'; end if;
  if private.invite_state(v.status, v.expires_at) <> 'pending' then
    raise exception 'invite_not_pending';
  end if;
  if v.kind = 'teacher' then
    select lower(u.email) into v_email from auth.users u where u.id = v_uid;
    if v_email is distinct from v.email then raise exception 'email_mismatch'; end if;
  else
    if private.my_role() is distinct from 'aluno' then raise exception 'role_not_allowed'; end if;
  end if;
  update public.invites set status = 'declined', declined_at = now() where id = v.id;
end $$;

-- Administrador: bloquear / desbloquear professor (regras 94 e 95).
-- Bloquear encerra as sessões na hora; como o token de acesso pode durar até
-- 1 h, as políticas também negam a conta bloqueada (ver private.my_role()).
create or replace function public.set_teacher_status(p_teacher_id uuid, p_status public.account_status)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if private.my_role() is distinct from 'admin' then raise exception 'forbidden'; end if;
  if not exists (select 1 from public.profiles p where p.id = p_teacher_id and p.role = 'professor') then
    raise exception 'teacher_not_found';
  end if;
  update public.profiles set status = p_status where id = p_teacher_id;
  if p_status = 'blocked' then
    delete from auth.sessions where user_id = p_teacher_id;
  end if;
end $$;

-- Administrador: só contagens, nunca dados de alunos (regra 87).
create or replace function public.admin_teacher_student_counts()
returns table (teacher_id uuid, active_students bigint)
language sql stable security definer set search_path = public as $$
  select p.id, count(s.id) filter (where s.status = 'active')
    from public.profiles p
    left join public.students s on s.teacher_id = p.id
   where p.role = 'professor' and private.my_role() = 'admin'
   group by p.id
$$;

-- Aluno: passo 1 do primeiro acesso (aviso de dados). Só depois do vínculo
-- (regra 91). Guardar a data permite retomar de onde parou (regra 86).
create or replace function public.accept_data_notice() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  if private.my_active_link() is null then raise exception 'no_teacher_link'; end if;
  insert into public.student_profiles (user_id, notice_accepted_at)
  values (v_uid, now())
  on conflict (user_id) do update
    set notice_accepted_at = coalesce(public.student_profiles.notice_accepted_at, excluded.notice_accepted_at);
end $$;

-- Aluno: passo 2 do primeiro acesso ("Concluir") e "Editar dados"
-- (regras 85, 99 e 108). Cada campo alterado é registrado em
-- student_profile_changes pelo gatilho.
create or replace function public.save_student_profile(
  p_full_name    text,
  p_birth_date   date,
  p_phone        text,
  p_height_m     numeric,
  p_weight_kg    numeric,
  p_restrictions text default null
) returns void
language plpgsql security definer set search_path = public as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text := btrim(coalesce(p_full_name, ''));
  v_phone text := nullif(btrim(coalesce(p_phone, '')), '');
  v_link  uuid;
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  v_link := private.my_active_link();
  if v_link is null then raise exception 'no_teacher_link'; end if;
  if not exists (select 1 from public.student_profiles sp
                  where sp.user_id = v_uid and sp.notice_accepted_at is not null) then
    raise exception 'notice_not_accepted';
  end if;
  if v_name = '' then raise exception 'name_required'; end if;
  if p_birth_date is null or p_birth_date > private.user_today(v_uid) then
    raise exception 'birth_date_invalid';
  end if;
  if v_phone is null or not private.phone_valid(v_phone) then raise exception 'phone_invalid'; end if;
  if p_height_m is null or p_height_m < 1.00 or p_height_m > 2.50 then raise exception 'height_invalid'; end if;
  if p_weight_kg is null or p_weight_kg < 20 or p_weight_kg > 300 then raise exception 'weight_invalid'; end if;

  update public.profiles set full_name = v_name where id = v_uid;
  update public.student_profiles
     set birth_date = p_birth_date,
         phone = v_phone,
         height_m = p_height_m,
         weight_kg = p_weight_kg,
         restrictions = nullif(btrim(coalesce(p_restrictions, '')), ''),
         completed_at = coalesce(completed_at, now())
   where user_id = v_uid;
end $$;

-- Aluno: exclui a própria conta (regra 120). Apaga perfil, vínculos e, por
-- cascata, treinos, marcações e cargas ligados à conta.
create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare v_uid uuid := auth.uid();
begin
  if private.my_role() is distinct from 'aluno' then raise exception 'forbidden'; end if;
  delete from auth.users where id = v_uid;
end $$;

-- ---------------------------------------------------------------------
-- Permissões de execução: nada para anon (exceto a pré-visualização do
-- convite); o resto só para usuários logados. As funções conferem o papel.
-- ---------------------------------------------------------------------
revoke all on function public.handle_new_user() from public, anon, authenticated;

revoke all on function public.get_invite_preview(text) from public, anon;
grant execute on function public.get_invite_preview(text) to anon, authenticated;

revoke all on function public.create_student_with_invite(text, text, text) from public, anon;
grant execute on function public.create_student_with_invite(text, text, text) to authenticated;
revoke all on function public.reissue_invite(uuid, text) from public, anon;
grant execute on function public.reissue_invite(uuid, text) to authenticated;
revoke all on function public.create_teacher_invite(text, text) from public, anon;
grant execute on function public.create_teacher_invite(text, text) to authenticated;
revoke all on function public.accept_student_invite(text, boolean) from public, anon;
grant execute on function public.accept_student_invite(text, boolean) to authenticated;
revoke all on function public.accept_teacher_invite(text) from public, anon;
grant execute on function public.accept_teacher_invite(text) to authenticated;
revoke all on function public.decline_invite(text) from public, anon;
grant execute on function public.decline_invite(text) to authenticated;
revoke all on function public.set_teacher_status(uuid, public.account_status) from public, anon;
grant execute on function public.set_teacher_status(uuid, public.account_status) to authenticated;
revoke all on function public.admin_teacher_student_counts() from public, anon;
grant execute on function public.admin_teacher_student_counts() to authenticated;
revoke all on function public.accept_data_notice() from public, anon;
grant execute on function public.accept_data_notice() to authenticated;
revoke all on function public.save_student_profile(text, date, text, numeric, numeric, text) from public, anon;
grant execute on function public.save_student_profile(text, date, text, numeric, numeric, text) to authenticated;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- Funções do schema private: só para quem está logado (políticas e views).
revoke all on all functions in schema private from public, anon;
grant execute on all functions in schema private to authenticated;

-- ---------------------------------------------------------------------
-- COMO CRIAR O ADMINISTRADOR (fora do app, uma vez):
--   1. Crie o usuário pelo painel do Supabase (Authentication > Users) com o
--      e-mail próprio do dono do produto (diferente do e-mail de professor).
--   2. Rode no SQL Editor:
--        update public.profiles set role = 'admin'
--         where email = 'EMAIL_DO_ADMIN';
--   Nenhuma função do app consegue criar ou promover administrador.
-- ---------------------------------------------------------------------
