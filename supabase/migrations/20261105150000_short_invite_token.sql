-- Token de convite curto (#118): 16 caracteres (~79 bits) de um alfabeto de 31 símbolos sem
-- ambíguos (sem 0, 1, i, l, o). Só o hash é gravado; convites antigos (64 hex) seguem valendo.
-- Aceita só bytes < 248 (31 x 8) e usa byte % 31, para todos os símbolos terem a mesma chance.
create or replace function private.new_token() returns text
language sql volatile
set search_path = '' as $$
  select string_agg(substr('23456789abcdefghjkmnpqrstuvwxyz', (b % 31) + 1, 1), '')
  from (
    select get_byte(r, i) as b
    from (select extensions.gen_random_bytes(64) as r) x, generate_series(0, 63) as i
    where get_byte(r, i) < 248
    limit 16
  ) v
$$;
