-- Token de convite curto (#118): 16 caracteres (~80 bits) de um alfabeto de 32 símbolos sem
-- ambíguos (sem 0, 1, i, l, o). Só o hash é gravado; convites antigos (64 hex) seguem valendo.
create or replace function private.new_token() returns text
language sql volatile
set search_path = '' as $$
  select string_agg(
    substr('23456789abcdefghjkmnpqrstuvwxyz', (get_byte(b, i) & 31) + 1, 1), ''
  )
  from (select extensions.gen_random_bytes(16) as b) r, generate_series(0, 15) as i
$$;
