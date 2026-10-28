// Roda os testes do banco sem Postgres instalado: Postgres 17 em WebAssembly
// (PGlite). Imita supabase/tests/run.sh: banco descartável em memória,
// 00_stub_supabase.sql + migrations em ordem + 10_tests.sql, cada comando
// numa transação própria (como o psql -f).
//
// Uso (na raiz do projeto):
//   npm --prefix supabase/tests/pglite install
//   node supabase/tests/pglite/run.mjs
//
// Diferenças em relação ao Supabase/run.sh (só aqui, nunca nos arquivos do
// projeto): as extensões vêm do contrib do PGlite. Se o pgcrypto do PGlite
// não carregar, digest(sha256) e gen_random_bytes viram equivalentes nativos.
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { unaccent } from '@electric-sql/pglite/contrib/unaccent';
import { pgcrypto } from '@electric-sql/pglite/contrib/pgcrypto';

const HERE = dirname(fileURLToPath(import.meta.url));
const TESTS = join(HERE, '..');
const MIGRATIONS = join(TESTS, '..', 'migrations');
const NO_PGCRYPTO = process.argv.includes('--sem-pgcrypto');

// Quebra um arquivo SQL em comandos, respeitando strings, identificadores
// entre aspas, $tag$...$tag$ e comentários.
function splitSql(sql) {
  const out = [];
  let cur = '';
  let i = 0;
  while (i < sql.length) {
    const c = sql[i];
    const two = sql.slice(i, i + 2);
    if (two === '--') {
      const end = sql.indexOf('\n', i);
      const stop = end === -1 ? sql.length : end + 1;
      cur += sql.slice(i, stop); i = stop; continue;
    }
    if (two === '/*') {
      const end = sql.indexOf('*/', i + 2);
      const stop = end === -1 ? sql.length : end + 2;
      cur += sql.slice(i, stop); i = stop; continue;
    }
    if (c === "'" || c === '"') {
      let j = i + 1;
      while (j < sql.length) {
        if (sql[j] === c) { if (sql[j + 1] === c) { j += 2; continue; } break; }
        j++;
      }
      cur += sql.slice(i, j + 1); i = j + 1; continue;
    }
    if (c === '$') {
      const m = /^\$([A-Za-z_][A-Za-z0-9_]*)?\$/.exec(sql.slice(i));
      if (m) {
        const tag = m[0];
        const end = sql.indexOf(tag, i + tag.length);
        const stop = end === -1 ? sql.length : end + tag.length;
        cur += sql.slice(i, stop); i = stop; continue;
      }
    }
    if (c === ';') {
      if (cur.trim()) out.push(cur.trim());
      cur = ''; i++; continue;
    }
    cur += c; i++;
  }
  if (cur.replace(/--[^\n]*/g, '').trim()) out.push(cur.trim());
  return out.filter((s) => s.replace(/--[^\n]*/g, '').trim());
}

const NATIVE_PGCRYPTO = `
create function extensions.digest(p text, alg text) returns bytea
language sql immutable as $$ select sha256(convert_to(p, 'UTF8')) $$;
create function extensions.gen_random_bytes(n integer) returns bytea
language sql volatile as $$
  select substring(decode(string_agg(md5(random()::text || clock_timestamp()::text), ''), 'hex') from 1 for n)
    from generate_series(1, (n + 15) / 16)
$$;`;

const extensions = { pg_trgm, unaccent };
if (!NO_PGCRYPTO) extensions.pgcrypto = pgcrypto;
const db = await PGlite.create({ extensions });

let oks = 0;
const onNotice = (n) => { if (n.message?.startsWith('ok  -')) oks++; };

async function runFile(label, sql) {
  for (const stmt of splitSql(sql)) {
    try {
      await db.exec(stmt, { onNotice });
    } catch (e) {
      console.error(`\n!! FALHA em ${label}: ${e.message}`);
      console.error(`   comando: ${stmt.slice(0, 300).replace(/\s+/g, ' ')}...`);
      process.exit(1);
    }
  }
}

await runFile('00_stub_supabase.sql', readFileSync(join(TESTS, '00_stub_supabase.sql'), 'utf8'));
if (NO_PGCRYPTO) await runFile('pgcrypto nativo (harness)', NATIVE_PGCRYPTO);

for (const f of readdirSync(MIGRATIONS).filter((f) => f.endsWith('.sql')).sort()) {
  let sql = readFileSync(join(MIGRATIONS, f), 'utf8');
  if (NO_PGCRYPTO) sql = sql.replace(/create extension if not exists pgcrypto[^;]*;/i, '');
  console.log(`>> migration ${f}`);
  await runFile(f, sql);
}

await runFile('10_tests.sql', readFileSync(join(TESTS, '10_tests.sql'), 'utf8'));
const { rows } = await db.query('select version()');
console.log(`${rows[0].version.split(' on ')[0]} (PGlite)${NO_PGCRYPTO ? ', pgcrypto nativo' : ''}`);
console.log(`${oks} verificações ok`);
console.log('== TODOS OS TESTES PASSARAM ==');
await db.close();
