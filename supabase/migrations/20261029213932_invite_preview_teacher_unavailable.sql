-- =====================================================================
-- Convite de professor bloqueado (regras 133 e 137, issue #53)
-- get_invite_preview passa a devolver state = 'teacher_unavailable' para
-- convite de aluno ainda válido cujo professor está bloqueado, para o app
-- mostrar "Este convite não está disponível no momento" já ao abrir o link.
-- Precedência (regra 137): já usado, substituído, vencido e recusado vêm
-- antes, então só o estado 'valid' vira 'teacher_unavailable'. O bloqueio
-- não muda o convite: desbloqueado dentro do prazo, ele volta a 'valid'.
-- Também devolve 'already_linked' (regra 134): a conta logada já é aluno
-- ativo do professor do convite, para o app mostrar o toast e ir para o
-- início já ao abrir (sem login, ou em convite de professor, é false). Só
-- fala da própria conta de quem abre; o accept_student_invite confere de novo.
-- Mesma assinatura, então os grants da 0001 continuam valendo.
-- =====================================================================

create or replace function public.get_invite_preview(p_token text) returns jsonb
language plpgsql stable security definer set search_path = public, extensions as $$
declare
  v public.invites%rowtype;
  v_state text;
  v_inviter text;
  v_teacher_status public.account_status;
  v_name text;
  v_teacher uuid;
begin
  select * into v from public.invites where token_hash = private.hash_token(p_token);
  if not found then
    return jsonb_build_object('state', 'invalid');
  end if;
  v_state := private.invite_state(v.status, v.expires_at);
  select p.full_name into v_inviter from public.profiles p where p.id = v.inviter_id;
  if v.kind = 'student' then
    select s.name, s.teacher_id into v_name, v_teacher from public.students s where s.id = v.student_id;
    -- O mesmo professor que o accept_student_invite confere (o do cadastro).
    select p.status into v_teacher_status from public.profiles p where p.id = v_teacher;
  else
    v_name := v.invitee_name;
  end if;
  return jsonb_build_object(
    'state', case when v_state = 'pending' and v.kind = 'student'
                       and v_teacher_status is distinct from 'active' then 'teacher_unavailable'
                  when v_state = 'pending' then 'valid'
                  when v_state = 'accepted' then 'used'
                  else v_state end,
    'kind', v.kind,
    'inviter_name', v_inviter,
    'invitee_name', v_name,
    'email', v.email,
    'account_exists', case when v.email is null then null
                           else exists (select 1 from public.profiles p where p.email = v.email) end,
    'expires_at', v.expires_at,
    'already_linked', v_teacher is not null and auth.uid() is not null and exists (
       select 1 from public.students s
        where s.user_id = auth.uid() and s.status = 'active' and s.teacher_id = v_teacher)
  );
end $$;
