-- =====================================================================
-- Coach In · 0007 · Catálogo de exercícios de musculação
-- Regras de produto: 30 a 32, 36, 74, 113, 114 (biblioteca) e 26 (carga).
-- Especificação: docs/contexto/catalogo-exercicios.md
-- Fonte dos dados:  docs/contexto/exercicios.catalogo.json (versao 1)
--
-- O que esta migration faz:
--  * Amplia public.exercises (slug, apelidos, carga, medida, versão do catálogo).
--  * Cria muscle_groups (15), equipment (55) e exercise_equipment.
--  * Escolha A: os 149 exercícios da 0004 são RENOMEADOS para os nomes do
--    catálogo e MANTÊM o id (treino, ficha e carga seguem apontando para eles,
--    regra 32). Os outros 100 entram como novos. Total: 249.
--  * A busca e o aviso de parecido passam a olhar também os apelidos.
--  * create_exercise aceita carga e medida e valida o grupo muscular.
--
-- Identidade estável entre ambientes = slug (não o id). Para mudar o catálogo
-- depois, crie uma migration nova que atualize pelo slug; nunca exclua
-- exercício (regra 31) e nunca altere esta migration depois de aplicada.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Grupos musculares e equipamentos (listas fechadas)
-- ---------------------------------------------------------------------
create table public.muscle_groups (
  name       text primary key,
  sort_order integer not null unique
);

create table public.equipment (
  slug       text primary key,
  name       text not null unique,
  category   text not null,
  sort_order integer not null unique
);

insert into public.muscle_groups (name, sort_order) values
  ('Peito', 1),
  ('Costas', 2),
  ('Ombros', 3),
  ('Bíceps', 4),
  ('Tríceps', 5),
  ('Antebraço', 6),
  ('Abdômen', 7),
  ('Lombar', 8),
  ('Glúteos', 9),
  ('Quadríceps', 10),
  ('Posterior de coxa', 11),
  ('Adutores', 12),
  ('Abdutores', 13),
  ('Panturrilha', 14),
  ('Trapézio', 15);

insert into public.equipment (slug, name, category, sort_order) values
  ('barra_reta', 'Barra reta', 'Peso livre', 1),
  ('barra_w', 'Barra W', 'Peso livre', 2),
  ('barra_hexagonal', 'Barra hexagonal', 'Peso livre', 3),
  ('halteres', 'Halteres', 'Peso livre', 4),
  ('kettlebell', 'Kettlebell', 'Peso livre', 5),
  ('anilha', 'Anilha', 'Peso livre', 6),
  ('caneleira', 'Caneleira', 'Peso livre', 7),
  ('banco_reto', 'Banco reto', 'Bancos e estruturas', 8),
  ('banco_ajustavel', 'Banco ajustável', 'Bancos e estruturas', 9),
  ('banco_declinado', 'Banco declinado', 'Bancos e estruturas', 10),
  ('banco_scott', 'Banco Scott', 'Bancos e estruturas', 11),
  ('banco_hiperextensao', 'Banco de hiperextensão', 'Bancos e estruturas', 12),
  ('cadeira_romana', 'Cadeira romana', 'Bancos e estruturas', 13),
  ('rack_agachamento', 'Rack de agachamento', 'Bancos e estruturas', 14),
  ('smith', 'Smith', 'Bancos e estruturas', 15),
  ('paralelas', 'Paralelas', 'Bancos e estruturas', 16),
  ('barra_fixa', 'Barra fixa', 'Bancos e estruturas', 17),
  ('step_caixa', 'Step ou caixa', 'Bancos e estruturas', 18),
  ('landmine', 'Landmine', 'Bancos e estruturas', 19),
  ('polia', 'Polia (cabos)', 'Polia', 20),
  ('supino_maquina', 'Supino (máquina)', 'Máquinas', 21),
  ('supino_inclinado_maquina', 'Supino inclinado (máquina)', 'Máquinas', 22),
  ('voador', 'Voador', 'Máquinas', 23),
  ('puxada_maquina', 'Puxada (máquina)', 'Máquinas', 24),
  ('remada_maquina', 'Remada (máquina)', 'Máquinas', 25),
  ('remada_cavalinho', 'Remada cavalinho', 'Máquinas', 26),
  ('pullover_maquina', 'Pullover (máquina)', 'Máquinas', 27),
  ('graviton', 'Barra assistida (Graviton)', 'Máquinas', 28),
  ('desenvolvimento_maquina', 'Desenvolvimento (máquina)', 'Máquinas', 29),
  ('elevacao_lateral_maquina', 'Elevação lateral (máquina)', 'Máquinas', 30),
  ('rosca_maquina', 'Rosca (máquina)', 'Máquinas', 31),
  ('triceps_maquina', 'Tríceps (máquina)', 'Máquinas', 32),
  ('abdominal_maquina', 'Abdominal (máquina)', 'Máquinas', 33),
  ('rotacao_maquina', 'Rotação de tronco (máquina)', 'Máquinas', 34),
  ('lombar_maquina', 'Lombar (máquina)', 'Máquinas', 35),
  ('leg_press_45', 'Leg press 45°', 'Máquinas', 36),
  ('leg_press_horizontal', 'Leg press horizontal', 'Máquinas', 37),
  ('hack', 'Hack', 'Máquinas', 38),
  ('pendulo', 'Pêndulo', 'Máquinas', 39),
  ('extensora', 'Cadeira extensora', 'Máquinas', 40),
  ('mesa_flexora', 'Mesa flexora', 'Máquinas', 41),
  ('cadeira_flexora', 'Cadeira flexora', 'Máquinas', 42),
  ('flexora_em_pe', 'Flexora em pé', 'Máquinas', 43),
  ('cadeira_adutora', 'Cadeira adutora', 'Máquinas', 44),
  ('cadeira_abdutora', 'Cadeira abdutora', 'Máquinas', 45),
  ('gluteo_maquina', 'Glúteo (máquina)', 'Máquinas', 46),
  ('hip_thrust_maquina', 'Elevação pélvica (máquina)', 'Máquinas', 47),
  ('panturrilha_em_pe', 'Panturrilha em pé (máquina)', 'Máquinas', 48),
  ('panturrilha_sentado', 'Panturrilha sentado (máquina)', 'Máquinas', 49),
  ('encolhimento_maquina', 'Encolhimento (máquina)', 'Máquinas', 50),
  ('elastico', 'Elástico', 'Acessórios', 51),
  ('bola_suica', 'Bola suíça', 'Acessórios', 52),
  ('suspensao', 'Suspensão (TRX)', 'Acessórios', 53),
  ('roda_abdominal', 'Roda abdominal', 'Acessórios', 54),
  ('peso_corporal', 'Peso corporal', 'Sem equipamento', 55);

-- ---------------------------------------------------------------------
-- 2. Novas colunas em exercises
--    load_mode: required = a ficha pede carga; optional = dá para somar lastro
--               ou usar assistência; none = só peso corporal (sem campo de carga).
--    measure:   reps = repetições; time = segundos.
--    slug e catalog_version: só os exercícios do catálogo (owner_id nulo).
-- ---------------------------------------------------------------------
alter table public.exercises
  add column slug               text,
  add column aliases            text[] not null default '{}',
  add column aliases_normalized text   not null default '',
  add column load_mode          text   not null default 'required'
    check (load_mode in ('required', 'optional', 'none')),
  add column measure            text   not null default 'reps'
    check (measure in ('reps', 'time')),
  add column catalog_version    integer;

-- O gatilho de normalização passa a preencher também os apelidos.
create or replace function private.exercises_normalize() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.name := btrim(regexp_replace(new.name, '\s+', ' ', 'g'));
  new.name_normalized := private.normalize_name(new.name);
  new.aliases_normalized := coalesce(
    (select string_agg(private.normalize_name(a), ' | ') from unnest(new.aliases) as a), '');
  return new;
end $$;
drop trigger exercises_normalize on public.exercises;
create trigger exercises_normalize before insert or update of name, aliases on public.exercises
  for each row execute function private.exercises_normalize();

create index exercises_aliases_trgm_idx
  on public.exercises using gin (aliases_normalized extensions.gin_trgm_ops);

create table public.exercise_equipment (
  exercise_id    uuid     not null references public.exercises (id) on delete restrict,
  equipment_slug text     not null references public.equipment (slug) on delete restrict,
  position       smallint not null check (position >= 1),   -- 1 = equipamento principal
  primary key (exercise_id, equipment_slug),
  unique (exercise_id, position)
);
create index exercise_equipment_equipment_idx on public.exercise_equipment (equipment_slug);

-- ---------------------------------------------------------------------
-- 3. Dados do catálogo (tabelas temporárias, apagadas no fim)
--    old_name = nome na 0004; nulo = exercício novo.
-- ---------------------------------------------------------------------
create temp table _catalog (
  slug         text primary key,
  old_name     text,
  name         text not null,
  muscle_group text not null,
  load_mode    text not null,
  measure      text not null,
  aliases      text[] not null
);
create temp table _catalog_equipment (
  slug           text not null,
  equipment_slug text not null,
  position       smallint not null
);

insert into _catalog (slug, old_name, name, muscle_group, load_mode, measure, aliases) values
  ('supino-reto-com-barra', 'Supino reto com barra', 'Supino reto com barra', 'Peito', 'required', 'reps', array['Supino', 'Supino reto', 'Bench press']::text[]),
  ('supino-inclinado-com-barra', 'Supino inclinado com barra', 'Supino inclinado com barra', 'Peito', 'required', 'reps', array['Supino inclinado']::text[]),
  ('supino-declinado-com-barra', 'Supino declinado com barra', 'Supino declinado com barra', 'Peito', 'required', 'reps', array['Supino declinado']::text[]),
  ('supino-reto-com-halteres', 'Supino reto com halteres', 'Supino reto com halteres', 'Peito', 'required', 'reps', array['Supino com halteres']::text[]),
  ('supino-inclinado-com-halteres', 'Supino inclinado com halteres', 'Supino inclinado com halteres', 'Peito', 'required', 'reps', '{}'::text[]),
  ('supino-declinado-com-halteres', 'Supino declinado com halteres', 'Supino declinado com halteres', 'Peito', 'required', 'reps', '{}'::text[]),
  ('supino-reto-com-halteres-pegada-neutra', null, 'Supino reto com halteres, pegada neutra', 'Peito', 'required', 'reps', '{}'::text[]),
  ('supino-reto-no-smith', 'Supino no Smith', 'Supino reto no Smith', 'Peito', 'required', 'reps', '{}'::text[]),
  ('supino-inclinado-no-smith', null, 'Supino inclinado no Smith', 'Peito', 'required', 'reps', '{}'::text[]),
  ('supino-reto-na-maquina', 'Supino reto na máquina', 'Supino reto na máquina', 'Peito', 'required', 'reps', array['Chest press', 'Supino articulado']::text[]),
  ('supino-inclinado-na-maquina', 'Supino inclinado na máquina', 'Supino inclinado na máquina', 'Peito', 'required', 'reps', '{}'::text[]),
  ('supino-na-polia-em-pe', null, 'Supino na polia em pé', 'Peito', 'required', 'reps', '{}'::text[]),
  ('supino-no-chao-com-halteres', null, 'Supino no chão com halteres', 'Peito', 'required', 'reps', array['Floor press']::text[]),
  ('crucifixo-reto-com-halteres', 'Crucifixo reto com halteres', 'Crucifixo reto com halteres', 'Peito', 'required', 'reps', array['Crucifixo']::text[]),
  ('crucifixo-inclinado-com-halteres', 'Crucifixo inclinado com halteres', 'Crucifixo inclinado com halteres', 'Peito', 'required', 'reps', '{}'::text[]),
  ('crucifixo-declinado-com-halteres', null, 'Crucifixo declinado com halteres', 'Peito', 'required', 'reps', '{}'::text[]),
  ('crucifixo-na-maquina', 'Voador (peck deck)', 'Crucifixo na máquina', 'Peito', 'required', 'reps', array['Voador', 'Peck deck', 'Peitoral na máquina']::text[]),
  ('crucifixo-reto-na-polia', null, 'Crucifixo reto na polia', 'Peito', 'required', 'reps', '{}'::text[]),
  ('crucifixo-inclinado-na-polia', null, 'Crucifixo inclinado na polia', 'Peito', 'required', 'reps', '{}'::text[]),
  ('crossover-na-polia-alta', 'Crossover na polia alta', 'Crossover na polia alta', 'Peito', 'required', 'reps', array['Cross over', 'Cabo cruzado']::text[]),
  ('crossover-na-polia-media', 'Crossover na polia média', 'Crossover na polia média', 'Peito', 'required', 'reps', '{}'::text[]),
  ('crossover-na-polia-baixa', 'Crossover na polia baixa', 'Crossover na polia baixa', 'Peito', 'required', 'reps', '{}'::text[]),
  ('crossover-unilateral-na-polia', null, 'Crossover unilateral na polia', 'Peito', 'required', 'reps', '{}'::text[]),
  ('crucifixo-com-elastico', null, 'Crucifixo com elástico', 'Peito', 'required', 'reps', '{}'::text[]),
  ('pullover-com-halter', 'Pullover com halter', 'Pullover com halter', 'Peito', 'required', 'reps', array['Pull-over']::text[]),
  ('svend-press', null, 'Svend press', 'Peito', 'required', 'reps', array['Press com anilha']::text[]),
  ('flexao-de-bracos', 'Flexão de braço', 'Flexão de braços', 'Peito', 'none', 'reps', array['Flexão', 'Flexão no chão']::text[]),
  ('flexao-de-bracos-com-joelhos-apoiados', 'Flexão de braço com joelhos apoiados', 'Flexão de braços com joelhos apoiados', 'Peito', 'none', 'reps', '{}'::text[]),
  ('flexao-de-bracos-inclinada-maos-elevadas', null, 'Flexão de braços inclinada, mãos elevadas', 'Peito', 'none', 'reps', '{}'::text[]),
  ('flexao-de-bracos-declinada-pes-elevados', null, 'Flexão de braços declinada, pés elevados', 'Peito', 'none', 'reps', '{}'::text[]),
  ('flexao-de-bracos-no-trx', null, 'Flexão de braços no TRX', 'Peito', 'none', 'reps', '{}'::text[]),
  ('mergulho-nas-paralelas-foco-no-peito', null, 'Mergulho nas paralelas, foco no peito', 'Peito', 'optional', 'reps', array['Paralelas', 'Dips']::text[]),
  ('puxada-alta-aberta', 'Puxada frontal na polia alta', 'Puxada alta aberta', 'Costas', 'required', 'reps', array['Pulley', 'Puxador frente', 'Puxada frontal', 'Pulldown', 'Lat pulldown']::text[]),
  ('puxada-alta-supinada', 'Puxada frontal com pegada supinada', 'Puxada alta supinada', 'Costas', 'required', 'reps', array['Puxada fechada supinada']::text[]),
  ('puxada-alta-com-triangulo', 'Puxada com triângulo', 'Puxada alta com triângulo', 'Costas', 'required', 'reps', array['Puxada neutra', 'Puxada fechada']::text[]),
  ('puxada-alta-atras-da-nuca', 'Puxada atrás da nuca', 'Puxada alta atrás da nuca', 'Costas', 'required', 'reps', array['Pulley atrás']::text[]),
  ('puxada-alta-unilateral', null, 'Puxada alta unilateral', 'Costas', 'required', 'reps', '{}'::text[]),
  ('puxada-na-maquina', 'Puxada articulada na máquina', 'Puxada na máquina', 'Costas', 'required', 'reps', array['Puxada articulada']::text[]),
  ('pulldown-com-bracos-estendidos', 'Pulldown com corda (braço estendido)', 'Pulldown com braços estendidos', 'Costas', 'required', 'reps', array['Pullover na polia']::text[]),
  ('barra-fixa-pronada', 'Barra fixa pronada', 'Barra fixa pronada', 'Costas', 'optional', 'reps', array['Barra fixa', 'Pull-up']::text[]),
  ('barra-fixa-supinada', 'Barra fixa supinada', 'Barra fixa supinada', 'Costas', 'optional', 'reps', array['Chin-up']::text[]),
  ('barra-fixa-com-pegada-neutra', null, 'Barra fixa com pegada neutra', 'Costas', 'optional', 'reps', '{}'::text[]),
  ('barra-fixa-assistida-na-maquina', 'Barra fixa assistida', 'Barra fixa assistida na máquina', 'Costas', 'required', 'reps', array['Graviton']::text[]),
  ('barra-fixa-com-elastico', null, 'Barra fixa com elástico', 'Costas', 'none', 'reps', '{}'::text[]),
  ('remada-curvada-com-barra', 'Remada curvada com barra', 'Remada curvada com barra', 'Costas', 'required', 'reps', array['Remada curvada']::text[]),
  ('remada-curvada-supinada-com-barra', 'Remada curvada com barra pegada supinada', 'Remada curvada supinada com barra', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-pendlay', null, 'Remada Pendlay', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-curvada-com-halteres', null, 'Remada curvada com halteres', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-unilateral-com-halter', 'Remada unilateral com halter (serrote)', 'Remada unilateral com halter', 'Costas', 'required', 'reps', array['Serrote', 'Remada serrote']::text[]),
  ('remada-com-apoio-no-banco-inclinado', null, 'Remada com apoio no banco inclinado', 'Costas', 'required', 'reps', array['Remada com peito apoiado']::text[]),
  ('remada-cavalinho', 'Remada cavalinho', 'Remada cavalinho', 'Costas', 'required', 'reps', array['Remada T', 'T-bar']::text[]),
  ('remada-com-landmine', null, 'Remada com landmine', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-baixa-com-triangulo', 'Remada baixa na polia com triângulo', 'Remada baixa com triângulo', 'Costas', 'required', 'reps', array['Remada sentada', 'Remada baixa']::text[]),
  ('remada-baixa-com-barra-reta', 'Remada baixa na polia com barra reta', 'Remada baixa com barra reta', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-baixa-com-pegada-aberta', null, 'Remada baixa com pegada aberta', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-unilateral-na-polia', 'Remada unilateral na polia', 'Remada unilateral na polia', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-sentada-na-maquina', 'Remada na máquina', 'Remada sentada na máquina', 'Costas', 'required', 'reps', array['Remada articulada']::text[]),
  ('remada-no-smith', 'Remada no Smith', 'Remada no Smith', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-invertida-no-smith', null, 'Remada invertida no Smith', 'Costas', 'none', 'reps', array['Remada invertida', 'Remada australiana']::text[]),
  ('remada-invertida-no-trx', null, 'Remada invertida no TRX', 'Costas', 'none', 'reps', '{}'::text[]),
  ('pullover-na-maquina', null, 'Pullover na máquina', 'Costas', 'required', 'reps', '{}'::text[]),
  ('remada-articulada-na-maquina', 'Remada articulada na máquina', 'Remada articulada na máquina', 'Costas', 'required', 'reps', '{}'::text[]),
  ('desenvolvimento-militar-com-barra', 'Desenvolvimento com barra', 'Desenvolvimento militar com barra', 'Ombros', 'required', 'reps', array['Desenvolvimento em pé', 'Military press']::text[]),
  ('desenvolvimento-com-barra-sentado', null, 'Desenvolvimento com barra sentado', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('desenvolvimento-com-halteres-sentado', 'Desenvolvimento com halteres', 'Desenvolvimento com halteres sentado', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('desenvolvimento-com-halteres-em-pe', null, 'Desenvolvimento com halteres em pé', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('desenvolvimento-arnold', 'Desenvolvimento Arnold', 'Desenvolvimento Arnold', 'Ombros', 'required', 'reps', array['Arnold press']::text[]),
  ('desenvolvimento-no-smith', 'Desenvolvimento no Smith', 'Desenvolvimento no Smith', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('desenvolvimento-na-maquina', 'Desenvolvimento na máquina', 'Desenvolvimento na máquina', 'Ombros', 'required', 'reps', array['Desenvolvimento articulado']::text[]),
  ('desenvolvimento-unilateral-com-landmine', null, 'Desenvolvimento unilateral com landmine', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('desenvolvimento-com-kettlebell', null, 'Desenvolvimento com kettlebell', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('flexao-pike', null, 'Flexão pike', 'Ombros', 'none', 'reps', '{}'::text[]),
  ('elevacao-lateral-com-halteres', 'Elevação lateral com halteres', 'Elevação lateral com halteres', 'Ombros', 'required', 'reps', array['Elevação lateral']::text[]),
  ('elevacao-lateral-sentado-com-halteres', null, 'Elevação lateral sentado com halteres', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('elevacao-lateral-na-polia', 'Elevação lateral na polia', 'Elevação lateral na polia', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('elevacao-lateral-na-maquina', 'Elevação lateral na máquina', 'Elevação lateral na máquina', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('elevacao-lateral-com-elastico', null, 'Elevação lateral com elástico', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('elevacao-frontal-com-halteres', 'Elevação frontal com halteres', 'Elevação frontal com halteres', 'Ombros', 'required', 'reps', array['Elevação frontal']::text[]),
  ('elevacao-frontal-com-barra', 'Elevação frontal com barra', 'Elevação frontal com barra', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('elevacao-frontal-com-anilha', null, 'Elevação frontal com anilha', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('elevacao-frontal-na-polia', 'Elevação frontal na polia', 'Elevação frontal na polia', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('crucifixo-invertido-com-halteres', 'Crucifixo inverso com halteres', 'Crucifixo invertido com halteres', 'Ombros', 'required', 'reps', array['Posterior de ombro']::text[]),
  ('crucifixo-invertido-no-banco-inclinado', null, 'Crucifixo invertido no banco inclinado', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('crucifixo-invertido-na-maquina', 'Crucifixo inverso na máquina', 'Crucifixo invertido na máquina', 'Ombros', 'required', 'reps', array['Voador invertido']::text[]),
  ('crucifixo-invertido-na-polia', null, 'Crucifixo invertido na polia', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('face-pull', 'Face pull', 'Face pull', 'Ombros', 'required', 'reps', array['Puxada para o rosto']::text[]),
  ('remada-alta-com-barra', 'Remada alta com barra', 'Remada alta com barra', 'Ombros', 'required', 'reps', array['Remada alta']::text[]),
  ('remada-alta-com-halteres', null, 'Remada alta com halteres', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('remada-alta-na-polia', 'Remada alta na polia', 'Remada alta na polia', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('rotacao-externa-na-polia', null, 'Rotação externa na polia', 'Ombros', 'required', 'reps', array['Manguito rotador']::text[]),
  ('rotacao-externa-com-halter-deitado-de-lado', null, 'Rotação externa com halter deitado de lado', 'Ombros', 'required', 'reps', array['Manguito rotador']::text[]),
  ('elevacao-em-y-no-banco-inclinado', null, 'Elevação em Y no banco inclinado', 'Ombros', 'required', 'reps', '{}'::text[]),
  ('rosca-direta-com-barra-reta', 'Rosca direta com barra reta', 'Rosca direta com barra reta', 'Bíceps', 'required', 'reps', array['Rosca direta']::text[]),
  ('rosca-direta-com-barra-w', 'Rosca direta com barra W', 'Rosca direta com barra W', 'Bíceps', 'required', 'reps', array['Rosca W']::text[]),
  ('rosca-direta-na-polia-baixa', 'Rosca na polia baixa', 'Rosca direta na polia baixa', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-alternada-com-halteres', 'Rosca alternada com halteres', 'Rosca alternada com halteres', 'Bíceps', 'required', 'reps', array['Rosca alternada']::text[]),
  ('rosca-simultanea-com-halteres', 'Rosca simultânea com halteres', 'Rosca simultânea com halteres', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-martelo-com-halteres', 'Rosca martelo com halteres', 'Rosca martelo com halteres', 'Bíceps', 'required', 'reps', array['Rosca martelo']::text[]),
  ('rosca-martelo-cruzada', null, 'Rosca martelo cruzada', 'Bíceps', 'required', 'reps', array['Rosca cross body']::text[]),
  ('rosca-martelo-na-polia-com-corda', 'Rosca martelo na corda', 'Rosca martelo na polia com corda', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-concentrada', 'Rosca concentrada', 'Rosca concentrada', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-scott-com-barra-w', 'Rosca Scott com barra', 'Rosca Scott com barra W', 'Bíceps', 'required', 'reps', array['Rosca Scott']::text[]),
  ('rosca-scott-com-halter-unilateral', 'Rosca Scott com halter', 'Rosca Scott com halter unilateral', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-scott-na-maquina', 'Rosca Scott na máquina', 'Rosca Scott na máquina', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-inclinada-com-halteres', 'Rosca inclinada com halteres', 'Rosca inclinada com halteres', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-spider', null, 'Rosca Spider', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-na-polia-alta', 'Rosca na polia alta (duplo bíceps)', 'Rosca na polia alta', 'Bíceps', 'required', 'reps', array['Rosca duplo bíceps']::text[]),
  ('rosca-unilateral-na-polia', null, 'Rosca unilateral na polia', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-zottman', null, 'Rosca Zottman', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-com-elastico', null, 'Rosca com elástico', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('rosca-21', 'Rosca 21', 'Rosca 21', 'Bíceps', 'required', 'reps', '{}'::text[]),
  ('triceps-na-polia-com-barra-reta', 'Tríceps pulley com barra reta', 'Tríceps na polia com barra reta', 'Tríceps', 'required', 'reps', array['Tríceps pulley', 'Pushdown']::text[]),
  ('triceps-na-polia-com-corda', 'Tríceps pulley com corda', 'Tríceps na polia com corda', 'Tríceps', 'required', 'reps', array['Tríceps corda']::text[]),
  ('triceps-na-polia-com-barra-v', 'Tríceps pulley com barra V', 'Tríceps na polia com barra V', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('triceps-unilateral-na-polia', null, 'Tríceps unilateral na polia', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('triceps-testa-com-barra-w', 'Tríceps testa com barra W', 'Tríceps testa com barra W', 'Tríceps', 'required', 'reps', array['Tríceps testa', 'Skullcrusher']::text[]),
  ('triceps-testa-com-halteres', 'Tríceps testa com halteres', 'Tríceps testa com halteres', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('triceps-testa-na-polia', null, 'Tríceps testa na polia', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('triceps-frances-com-halter', 'Tríceps francês com halter', 'Tríceps francês com halter', 'Tríceps', 'required', 'reps', array['Tríceps francês']::text[]),
  ('triceps-frances-unilateral-com-halter', null, 'Tríceps francês unilateral com halter', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('triceps-frances-na-polia', 'Tríceps francês na polia com corda', 'Tríceps francês na polia', 'Tríceps', 'required', 'reps', array['Tríceps corda atrás da cabeça']::text[]),
  ('triceps-coice-com-halter', 'Tríceps coice com halter', 'Tríceps coice com halter', 'Tríceps', 'required', 'reps', array['Tríceps coice', 'Kickback']::text[]),
  ('triceps-coice-na-polia', 'Tríceps coice na polia', 'Tríceps coice na polia', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('triceps-na-maquina', 'Tríceps na máquina', 'Tríceps na máquina', 'Tríceps', 'required', 'reps', array['Mergulho na máquina']::text[]),
  ('supino-fechado-com-barra', 'Supino fechado com barra', 'Supino fechado com barra', 'Tríceps', 'required', 'reps', array['Supino pegada fechada']::text[]),
  ('supino-fechado-no-smith', null, 'Supino fechado no Smith', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('mergulho-no-banco', 'Mergulho no banco', 'Mergulho no banco', 'Tríceps', 'optional', 'reps', array['Tríceps banco']::text[]),
  ('mergulho-nas-paralelas-foco-no-triceps', 'Mergulho nas paralelas', 'Mergulho nas paralelas, foco no tríceps', 'Tríceps', 'optional', 'reps', array['Paralelas', 'Dips']::text[]),
  ('flexao-diamante', null, 'Flexão diamante', 'Tríceps', 'none', 'reps', array['Flexão fechada']::text[]),
  ('triceps-com-elastico', null, 'Tríceps com elástico', 'Tríceps', 'required', 'reps', '{}'::text[]),
  ('triceps-na-polia-com-pegada-supinada', 'Tríceps pulley invertido (pegada supinada)', 'Tríceps na polia com pegada supinada', 'Tríceps', 'required', 'reps', array['Tríceps pulley invertido']::text[]),
  ('rosca-de-punho-com-barra', 'Rosca de punho com barra', 'Rosca de punho com barra', 'Antebraço', 'required', 'reps', array['Rosca punho']::text[]),
  ('rosca-de-punho-com-halteres', 'Rosca de punho com halteres', 'Rosca de punho com halteres', 'Antebraço', 'required', 'reps', '{}'::text[]),
  ('rosca-de-punho-inversa-com-barra', 'Extensão de punho com barra', 'Rosca de punho inversa com barra', 'Antebraço', 'required', 'reps', array['Extensão de punho']::text[]),
  ('rosca-inversa-com-barra-w', 'Rosca inversa com barra', 'Rosca inversa com barra W', 'Antebraço', 'required', 'reps', '{}'::text[]),
  ('rosca-inversa-na-polia', null, 'Rosca inversa na polia', 'Antebraço', 'required', 'reps', '{}'::text[]),
  ('pronacao-e-supinacao-com-halter', null, 'Pronação e supinação com halter', 'Antebraço', 'required', 'reps', '{}'::text[]),
  ('pendurado-na-barra-fixa', null, 'Pendurado na barra fixa', 'Antebraço', 'none', 'time', array['Dead hang', 'Pegada na barra']::text[]),
  ('rosca-de-punho-inversa-com-halteres', 'Extensão de punho com halteres', 'Rosca de punho inversa com halteres', 'Antebraço', 'required', 'reps', array['Extensão de punho']::text[]),
  ('abdominal-reto-no-solo', 'Abdominal supra no solo', 'Abdominal reto no solo', 'Abdômen', 'none', 'reps', array['Abdominal', 'Abdominal supra', 'Crunch']::text[]),
  ('abdominal-com-anilha', null, 'Abdominal com anilha', 'Abdômen', 'required', 'reps', '{}'::text[]),
  ('abdominal-na-maquina', 'Abdominal na máquina', 'Abdominal na máquina', 'Abdômen', 'required', 'reps', '{}'::text[]),
  ('abdominal-na-polia', 'Abdominal na polia com corda', 'Abdominal na polia', 'Abdômen', 'required', 'reps', array['Abdominal corda', 'Crunch na polia']::text[]),
  ('abdominal-declinado', null, 'Abdominal declinado', 'Abdômen', 'optional', 'reps', '{}'::text[]),
  ('abdominal-na-bola-suica', null, 'Abdominal na bola suíça', 'Abdômen', 'none', 'reps', '{}'::text[]),
  ('abdominal-infra-no-solo', 'Abdominal infra no solo', 'Abdominal infra no solo', 'Abdômen', 'none', 'reps', array['Elevação de pernas deitado']::text[]),
  ('elevacao-de-pernas-na-barra-fixa', 'Elevação de pernas na barra fixa', 'Elevação de pernas na barra fixa', 'Abdômen', 'none', 'reps', '{}'::text[]),
  ('elevacao-de-joelhos-na-barra-fixa', null, 'Elevação de joelhos na barra fixa', 'Abdômen', 'none', 'reps', '{}'::text[]),
  ('elevacao-de-pernas-na-cadeira-romana', null, 'Elevação de pernas na cadeira romana', 'Abdômen', 'none', 'reps', array['Cadeira capitão']::text[]),
  ('elevacao-de-joelhos-na-cadeira-romana', null, 'Elevação de joelhos na cadeira romana', 'Abdômen', 'none', 'reps', array['Cadeira capitão']::text[]),
  ('abdominal-remador', 'Abdominal canivete', 'Abdominal remador', 'Abdômen', 'none', 'reps', array['Canivete']::text[]),
  ('abdominal-bicicleta', 'Abdominal bicicleta', 'Abdominal bicicleta', 'Abdômen', 'none', 'reps', '{}'::text[]),
  ('abdominal-obliquo-no-solo', 'Abdominal oblíquo', 'Abdominal oblíquo no solo', 'Abdômen', 'none', 'reps', array['Crunch lateral']::text[]),
  ('lenhador-na-polia', null, 'Lenhador na polia', 'Abdômen', 'required', 'reps', array['Woodchopper', 'Rotação na polia']::text[]),
  ('rotacao-russa', 'Rotação russa (russian twist)', 'Rotação russa', 'Abdômen', 'optional', 'reps', array['Russian twist']::text[]),
  ('rotacao-de-tronco-na-maquina', null, 'Rotação de tronco na máquina', 'Abdômen', 'required', 'reps', '{}'::text[]),
  ('pallof-press', null, 'Pallof press', 'Abdômen', 'required', 'reps', array['Antirrotação']::text[]),
  ('flexao-lateral-de-tronco-com-halter', null, 'Flexão lateral de tronco com halter', 'Abdômen', 'required', 'reps', array['Inclinação lateral']::text[]),
  ('abdominal-com-roda', 'Roda abdominal', 'Abdominal com roda', 'Abdômen', 'none', 'reps', array['Roda abdominal']::text[]),
  ('prancha-frontal', 'Prancha frontal', 'Prancha frontal', 'Abdômen', 'none', 'time', array['Prancha']::text[]),
  ('prancha-lateral', 'Prancha lateral', 'Prancha lateral', 'Abdômen', 'none', 'time', '{}'::text[]),
  ('hollow-hold', null, 'Hollow hold', 'Abdômen', 'none', 'time', array['Barquinho']::text[]),
  ('dead-bug', null, 'Dead bug', 'Abdômen', 'none', 'reps', '{}'::text[]),
  ('elevacao-de-pernas-no-banco', 'Elevação de pernas no banco', 'Elevação de pernas no banco', 'Abdômen', 'none', 'reps', '{}'::text[]),
  ('hiperextensao-lombar', 'Hiperextensão lombar no banco romano', 'Hiperextensão lombar', 'Lombar', 'optional', 'reps', array['Extensão lombar', 'Banco romano']::text[]),
  ('extensao-lombar-na-maquina', null, 'Extensão lombar na máquina', 'Lombar', 'required', 'reps', array['Cadeira lombar']::text[]),
  ('extensao-lombar-na-bola-suica', null, 'Extensão lombar na bola suíça', 'Lombar', 'none', 'reps', '{}'::text[]),
  ('superman', 'Extensão lombar no solo', 'Superman', 'Lombar', 'none', 'reps', '{}'::text[]),
  ('bird-dog', null, 'Bird dog', 'Lombar', 'none', 'reps', array['Cachorro e pássaro']::text[]),
  ('bom-dia-com-barra', 'Bom dia (good morning)', 'Bom dia com barra', 'Lombar', 'required', 'reps', array['Good morning']::text[]),
  ('elevacao-pelvica-com-barra', 'Elevação pélvica com barra', 'Elevação pélvica com barra', 'Glúteos', 'required', 'reps', array['Hip thrust']::text[]),
  ('elevacao-pelvica-no-smith', null, 'Elevação pélvica no Smith', 'Glúteos', 'required', 'reps', array['Hip thrust no Smith']::text[]),
  ('elevacao-pelvica-na-maquina', 'Elevação pélvica na máquina', 'Elevação pélvica na máquina', 'Glúteos', 'required', 'reps', '{}'::text[]),
  ('elevacao-pelvica-com-halter', 'Elevação pélvica com halter', 'Elevação pélvica com halter', 'Glúteos', 'required', 'reps', '{}'::text[]),
  ('elevacao-pelvica-unilateral', null, 'Elevação pélvica unilateral', 'Glúteos', 'optional', 'reps', '{}'::text[]),
  ('ponte-de-gluteos', 'Ponte de glúteos', 'Ponte de glúteos', 'Glúteos', 'none', 'reps', array['Glute bridge']::text[]),
  ('ponte-de-gluteos-unilateral', null, 'Ponte de glúteos unilateral', 'Glúteos', 'none', 'reps', '{}'::text[]),
  ('coice-na-polia', 'Glúteo na polia (coice)', 'Coice na polia', 'Glúteos', 'required', 'reps', array['Glúteo na polia', 'Kickback na polia']::text[]),
  ('coice-na-maquina', 'Glúteo na máquina (coice)', 'Coice na máquina', 'Glúteos', 'required', 'reps', array['Glúteo na máquina']::text[]),
  ('coice-com-caneleira', null, 'Coice com caneleira', 'Glúteos', 'required', 'reps', array['Quatro apoios']::text[]),
  ('coice-no-smith', null, 'Coice no Smith', 'Glúteos', 'required', 'reps', '{}'::text[]),
  ('extensao-de-quadril-em-pe-na-polia', null, 'Extensão de quadril em pé na polia', 'Glúteos', 'required', 'reps', '{}'::text[]),
  ('agachamento-sumo-com-halter', 'Agachamento sumô', 'Agachamento sumô com halter', 'Glúteos', 'required', 'reps', array['Sumô']::text[]),
  ('subida-no-banco-com-halteres', 'Subida no banco (step-up) com halteres', 'Subida no banco com halteres', 'Glúteos', 'required', 'reps', array['Step-up']::text[]),
  ('extensao-de-quadril-no-banco-45', 'Extensão de quadril no banco 45°', 'Extensão de quadril no banco 45°', 'Glúteos', 'optional', 'reps', '{}'::text[]),
  ('agachamento-livre-com-barra', 'Agachamento livre com barra', 'Agachamento livre com barra', 'Quadríceps', 'required', 'reps', array['Agachamento', 'Agachamento livre', 'Back squat']::text[]),
  ('agachamento-frontal-com-barra', 'Agachamento frontal com barra', 'Agachamento frontal com barra', 'Quadríceps', 'required', 'reps', array['Front squat']::text[]),
  ('agachamento-no-smith', 'Agachamento no Smith', 'Agachamento no Smith', 'Quadríceps', 'required', 'reps', array['Agachamento guiado']::text[]),
  ('agachamento-hack', 'Agachamento hack', 'Agachamento hack', 'Quadríceps', 'required', 'reps', array['Hack']::text[]),
  ('agachamento-pendulo', null, 'Agachamento pêndulo', 'Quadríceps', 'required', 'reps', array['Pêndulo']::text[]),
  ('leg-press-45', 'Leg press 45°', 'Leg press 45°', 'Quadríceps', 'required', 'reps', array['Leg press', 'Leg 45']::text[]),
  ('leg-press-horizontal', 'Leg press horizontal', 'Leg press horizontal', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('leg-press-unilateral', null, 'Leg press unilateral', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('cadeira-extensora', 'Cadeira extensora', 'Cadeira extensora', 'Quadríceps', 'required', 'reps', array['Extensora']::text[]),
  ('cadeira-extensora-unilateral', null, 'Cadeira extensora unilateral', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('agachamento-goblet', 'Agachamento goblet com halter', 'Agachamento goblet', 'Quadríceps', 'required', 'reps', array['Goblet squat']::text[]),
  ('agachamento-com-halteres', null, 'Agachamento com halteres', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('agachamento-bulgaro-com-halteres', 'Agachamento búlgaro', 'Agachamento búlgaro com halteres', 'Quadríceps', 'required', 'reps', array['Búlgaro']::text[]),
  ('agachamento-bulgaro-no-smith', null, 'Agachamento búlgaro no Smith', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('afundo-estatico-com-halteres', null, 'Afundo estático com halteres', 'Quadríceps', 'required', 'reps', array['Agachamento afundo', 'Split squat']::text[]),
  ('avanco-com-halteres', 'Afundo com halteres', 'Avanço com halteres', 'Quadríceps', 'required', 'reps', array['Passada', 'Avanço']::text[]),
  ('avanco-com-barra', 'Afundo com barra', 'Avanço com barra', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('avanco-no-smith', 'Afundo no Smith', 'Avanço no Smith', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('avanco-caminhando', 'Passada (caminhada) com halteres', 'Avanço caminhando', 'Quadríceps', 'required', 'reps', array['Passada caminhando']::text[]),
  ('avanco-reverso', null, 'Avanço reverso', 'Quadríceps', 'required', 'reps', array['Passada para trás', 'Recuo']::text[]),
  ('avanco-lateral', 'Afundo lateral', 'Avanço lateral', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('agachamento-livre-com-peso-corporal', null, 'Agachamento livre com peso corporal', 'Quadríceps', 'optional', 'reps', array['Agachamento sem peso']::text[]),
  ('agachamento-sissy', 'Sissy squat', 'Agachamento sissy', 'Quadríceps', 'none', 'reps', '{}'::text[]),
  ('agachamento-pistola', null, 'Agachamento pistola', 'Quadríceps', 'optional', 'reps', array['Pistol squat']::text[]),
  ('agachamento-isometrico-na-parede', null, 'Agachamento isométrico na parede', 'Quadríceps', 'none', 'time', array['Cadeirinha']::text[]),
  ('agachamento-na-maquina', 'Agachamento na máquina', 'Agachamento na máquina', 'Quadríceps', 'required', 'reps', '{}'::text[]),
  ('avanco-com-peso-corporal', 'Avanço', 'Avanço com peso corporal', 'Quadríceps', 'optional', 'reps', array['Avanço']::text[]),
  ('mesa-flexora', 'Mesa flexora', 'Mesa flexora', 'Posterior de coxa', 'required', 'reps', array['Flexora deitada', 'Flexora']::text[]),
  ('cadeira-flexora', 'Cadeira flexora', 'Cadeira flexora', 'Posterior de coxa', 'required', 'reps', array['Flexora sentada']::text[]),
  ('flexora-em-pe', 'Flexora em pé', 'Flexora em pé', 'Posterior de coxa', 'required', 'reps', array['Flexora unilateral em pé']::text[]),
  ('flexora-na-polia', null, 'Flexora na polia', 'Posterior de coxa', 'required', 'reps', '{}'::text[]),
  ('flexora-com-bola-suica', null, 'Flexora com bola suíça', 'Posterior de coxa', 'none', 'reps', '{}'::text[]),
  ('flexao-nordica', 'Flexão nórdica', 'Flexão nórdica', 'Posterior de coxa', 'none', 'reps', array['Nordic curl']::text[]),
  ('stiff-com-barra', 'Stiff com barra', 'Stiff com barra', 'Posterior de coxa', 'required', 'reps', array['Stiff']::text[]),
  ('stiff-com-halteres', 'Stiff com halteres', 'Stiff com halteres', 'Posterior de coxa', 'required', 'reps', '{}'::text[]),
  ('stiff-no-smith', null, 'Stiff no Smith', 'Posterior de coxa', 'required', 'reps', '{}'::text[]),
  ('stiff-unilateral-com-halter', null, 'Stiff unilateral com halter', 'Posterior de coxa', 'required', 'reps', '{}'::text[]),
  ('levantamento-terra-romeno', 'Levantamento terra romeno', 'Levantamento terra romeno', 'Posterior de coxa', 'required', 'reps', array['RDL', 'Terra romeno']::text[]),
  ('levantamento-terra-convencional', 'Levantamento terra', 'Levantamento terra convencional', 'Posterior de coxa', 'required', 'reps', array['Levantamento terra', 'Terra', 'Deadlift']::text[]),
  ('levantamento-terra-sumo', null, 'Levantamento terra sumô', 'Posterior de coxa', 'required', 'reps', array['Terra sumô']::text[]),
  ('levantamento-terra-com-barra-hexagonal', null, 'Levantamento terra com barra hexagonal', 'Posterior de coxa', 'required', 'reps', array['Terra com barra hex']::text[]),
  ('cadeira-adutora', 'Adução de quadril na máquina (cadeira adutora)', 'Cadeira adutora', 'Adutores', 'required', 'reps', array['Adutora']::text[]),
  ('aducao-na-polia', null, 'Adução na polia', 'Adutores', 'required', 'reps', '{}'::text[]),
  ('aducao-deitado-de-lado', null, 'Adução deitado de lado', 'Adutores', 'optional', 'reps', '{}'::text[]),
  ('aducao-com-bola-entre-os-joelhos', null, 'Adução com bola entre os joelhos', 'Adutores', 'none', 'reps', '{}'::text[]),
  ('cadeira-abdutora', 'Abdução de quadril na máquina (cadeira abdutora)', 'Cadeira abdutora', 'Abdutores', 'required', 'reps', array['Abdutora']::text[]),
  ('abducao-na-polia', 'Abdução de quadril na polia', 'Abdução na polia', 'Abdutores', 'required', 'reps', '{}'::text[]),
  ('abducao-deitado-de-lado-com-caneleira', null, 'Abdução deitado de lado com caneleira', 'Abdutores', 'required', 'reps', '{}'::text[]),
  ('abducao-em-pe-com-elastico', null, 'Abdução em pé com elástico', 'Abdutores', 'required', 'reps', '{}'::text[]),
  ('caminhada-lateral-com-elastico', null, 'Caminhada lateral com elástico', 'Abdutores', 'required', 'reps', array['Monster walk']::text[]),
  ('concha-com-elastico', null, 'Concha com elástico', 'Abdutores', 'required', 'reps', array['Clamshell']::text[]),
  ('panturrilha-em-pe-na-maquina', 'Panturrilha em pé na máquina', 'Panturrilha em pé na máquina', 'Panturrilha', 'required', 'reps', array['Gêmeos em pé']::text[]),
  ('panturrilha-sentado-na-maquina', 'Panturrilha sentado na máquina', 'Panturrilha sentado na máquina', 'Panturrilha', 'required', 'reps', array['Gêmeos sentado', 'Sóleo']::text[]),
  ('panturrilha-no-leg-press', 'Panturrilha no leg press', 'Panturrilha no leg press', 'Panturrilha', 'required', 'reps', '{}'::text[]),
  ('panturrilha-no-smith', 'Panturrilha no Smith', 'Panturrilha no Smith', 'Panturrilha', 'required', 'reps', '{}'::text[]),
  ('panturrilha-unilateral-com-halter', 'Panturrilha unilateral com halter', 'Panturrilha unilateral com halter', 'Panturrilha', 'required', 'reps', '{}'::text[]),
  ('panturrilha-em-pe-com-peso-corporal', 'Panturrilha em pé no degrau', 'Panturrilha em pé com peso corporal', 'Panturrilha', 'optional', 'reps', '{}'::text[]),
  ('elevacao-de-pontas-dos-pes', null, 'Elevação de pontas dos pés', 'Panturrilha', 'none', 'reps', array['Tibial anterior', 'Tibial']::text[]),
  ('encolhimento-com-barra', 'Encolhimento com barra', 'Encolhimento com barra', 'Trapézio', 'required', 'reps', array['Encolhimento', 'Shrug']::text[]),
  ('encolhimento-com-halteres', 'Encolhimento com halteres', 'Encolhimento com halteres', 'Trapézio', 'required', 'reps', '{}'::text[]),
  ('encolhimento-no-smith', 'Encolhimento no Smith', 'Encolhimento no Smith', 'Trapézio', 'required', 'reps', '{}'::text[]),
  ('encolhimento-com-barra-hexagonal', null, 'Encolhimento com barra hexagonal', 'Trapézio', 'required', 'reps', '{}'::text[]),
  ('encolhimento-na-polia', null, 'Encolhimento na polia', 'Trapézio', 'required', 'reps', '{}'::text[]),
  ('encolhimento-na-maquina', 'Encolhimento na máquina', 'Encolhimento na máquina', 'Trapézio', 'required', 'reps', '{}'::text[]);

insert into _catalog_equipment (slug, equipment_slug, position) values
  ('supino-reto-com-barra', 'barra_reta', 1),
  ('supino-reto-com-barra', 'banco_reto', 2),
  ('supino-inclinado-com-barra', 'barra_reta', 1),
  ('supino-inclinado-com-barra', 'banco_ajustavel', 2),
  ('supino-declinado-com-barra', 'barra_reta', 1),
  ('supino-declinado-com-barra', 'banco_declinado', 2),
  ('supino-reto-com-halteres', 'halteres', 1),
  ('supino-reto-com-halteres', 'banco_reto', 2),
  ('supino-inclinado-com-halteres', 'halteres', 1),
  ('supino-inclinado-com-halteres', 'banco_ajustavel', 2),
  ('supino-declinado-com-halteres', 'halteres', 1),
  ('supino-declinado-com-halteres', 'banco_declinado', 2),
  ('supino-reto-com-halteres-pegada-neutra', 'halteres', 1),
  ('supino-reto-com-halteres-pegada-neutra', 'banco_reto', 2),
  ('supino-reto-no-smith', 'smith', 1),
  ('supino-reto-no-smith', 'banco_reto', 2),
  ('supino-inclinado-no-smith', 'smith', 1),
  ('supino-inclinado-no-smith', 'banco_ajustavel', 2),
  ('supino-reto-na-maquina', 'supino_maquina', 1),
  ('supino-inclinado-na-maquina', 'supino_inclinado_maquina', 1),
  ('supino-na-polia-em-pe', 'polia', 1),
  ('supino-no-chao-com-halteres', 'halteres', 1),
  ('crucifixo-reto-com-halteres', 'halteres', 1),
  ('crucifixo-reto-com-halteres', 'banco_reto', 2),
  ('crucifixo-inclinado-com-halteres', 'halteres', 1),
  ('crucifixo-inclinado-com-halteres', 'banco_ajustavel', 2),
  ('crucifixo-declinado-com-halteres', 'halteres', 1),
  ('crucifixo-declinado-com-halteres', 'banco_declinado', 2),
  ('crucifixo-na-maquina', 'voador', 1),
  ('crucifixo-reto-na-polia', 'polia', 1),
  ('crucifixo-reto-na-polia', 'banco_reto', 2),
  ('crucifixo-inclinado-na-polia', 'polia', 1),
  ('crucifixo-inclinado-na-polia', 'banco_ajustavel', 2),
  ('crossover-na-polia-alta', 'polia', 1),
  ('crossover-na-polia-media', 'polia', 1),
  ('crossover-na-polia-baixa', 'polia', 1),
  ('crossover-unilateral-na-polia', 'polia', 1),
  ('crucifixo-com-elastico', 'elastico', 1),
  ('pullover-com-halter', 'halteres', 1),
  ('pullover-com-halter', 'banco_reto', 2),
  ('svend-press', 'anilha', 1),
  ('flexao-de-bracos', 'peso_corporal', 1),
  ('flexao-de-bracos-com-joelhos-apoiados', 'peso_corporal', 1),
  ('flexao-de-bracos-inclinada-maos-elevadas', 'peso_corporal', 1),
  ('flexao-de-bracos-inclinada-maos-elevadas', 'banco_reto', 2),
  ('flexao-de-bracos-declinada-pes-elevados', 'peso_corporal', 1),
  ('flexao-de-bracos-declinada-pes-elevados', 'banco_reto', 2),
  ('flexao-de-bracos-no-trx', 'suspensao', 1),
  ('mergulho-nas-paralelas-foco-no-peito', 'paralelas', 1),
  ('puxada-alta-aberta', 'polia', 1),
  ('puxada-alta-supinada', 'polia', 1),
  ('puxada-alta-com-triangulo', 'polia', 1),
  ('puxada-alta-atras-da-nuca', 'polia', 1),
  ('puxada-alta-unilateral', 'polia', 1),
  ('puxada-na-maquina', 'puxada_maquina', 1),
  ('pulldown-com-bracos-estendidos', 'polia', 1),
  ('barra-fixa-pronada', 'barra_fixa', 1),
  ('barra-fixa-supinada', 'barra_fixa', 1),
  ('barra-fixa-com-pegada-neutra', 'barra_fixa', 1),
  ('barra-fixa-assistida-na-maquina', 'graviton', 1),
  ('barra-fixa-com-elastico', 'barra_fixa', 1),
  ('barra-fixa-com-elastico', 'elastico', 2),
  ('remada-curvada-com-barra', 'barra_reta', 1),
  ('remada-curvada-supinada-com-barra', 'barra_reta', 1),
  ('remada-pendlay', 'barra_reta', 1),
  ('remada-curvada-com-halteres', 'halteres', 1),
  ('remada-unilateral-com-halter', 'halteres', 1),
  ('remada-unilateral-com-halter', 'banco_reto', 2),
  ('remada-com-apoio-no-banco-inclinado', 'halteres', 1),
  ('remada-com-apoio-no-banco-inclinado', 'banco_ajustavel', 2),
  ('remada-cavalinho', 'remada_cavalinho', 1),
  ('remada-com-landmine', 'landmine', 1),
  ('remada-baixa-com-triangulo', 'polia', 1),
  ('remada-baixa-com-barra-reta', 'polia', 1),
  ('remada-baixa-com-pegada-aberta', 'polia', 1),
  ('remada-unilateral-na-polia', 'polia', 1),
  ('remada-sentada-na-maquina', 'remada_maquina', 1),
  ('remada-no-smith', 'smith', 1),
  ('remada-invertida-no-smith', 'smith', 1),
  ('remada-invertida-no-trx', 'suspensao', 1),
  ('pullover-na-maquina', 'pullover_maquina', 1),
  ('remada-articulada-na-maquina', 'remada_maquina', 1),
  ('desenvolvimento-militar-com-barra', 'barra_reta', 1),
  ('desenvolvimento-com-barra-sentado', 'barra_reta', 1),
  ('desenvolvimento-com-barra-sentado', 'banco_ajustavel', 2),
  ('desenvolvimento-com-halteres-sentado', 'halteres', 1),
  ('desenvolvimento-com-halteres-sentado', 'banco_ajustavel', 2),
  ('desenvolvimento-com-halteres-em-pe', 'halteres', 1),
  ('desenvolvimento-arnold', 'halteres', 1),
  ('desenvolvimento-arnold', 'banco_ajustavel', 2),
  ('desenvolvimento-no-smith', 'smith', 1),
  ('desenvolvimento-no-smith', 'banco_ajustavel', 2),
  ('desenvolvimento-na-maquina', 'desenvolvimento_maquina', 1),
  ('desenvolvimento-unilateral-com-landmine', 'landmine', 1),
  ('desenvolvimento-com-kettlebell', 'kettlebell', 1),
  ('flexao-pike', 'peso_corporal', 1),
  ('elevacao-lateral-com-halteres', 'halteres', 1),
  ('elevacao-lateral-sentado-com-halteres', 'halteres', 1),
  ('elevacao-lateral-sentado-com-halteres', 'banco_ajustavel', 2),
  ('elevacao-lateral-na-polia', 'polia', 1),
  ('elevacao-lateral-na-maquina', 'elevacao_lateral_maquina', 1),
  ('elevacao-lateral-com-elastico', 'elastico', 1),
  ('elevacao-frontal-com-halteres', 'halteres', 1),
  ('elevacao-frontal-com-barra', 'barra_reta', 1),
  ('elevacao-frontal-com-anilha', 'anilha', 1),
  ('elevacao-frontal-na-polia', 'polia', 1),
  ('crucifixo-invertido-com-halteres', 'halteres', 1),
  ('crucifixo-invertido-no-banco-inclinado', 'halteres', 1),
  ('crucifixo-invertido-no-banco-inclinado', 'banco_ajustavel', 2),
  ('crucifixo-invertido-na-maquina', 'voador', 1),
  ('crucifixo-invertido-na-polia', 'polia', 1),
  ('face-pull', 'polia', 1),
  ('remada-alta-com-barra', 'barra_reta', 1),
  ('remada-alta-com-halteres', 'halteres', 1),
  ('remada-alta-na-polia', 'polia', 1),
  ('rotacao-externa-na-polia', 'polia', 1),
  ('rotacao-externa-com-halter-deitado-de-lado', 'halteres', 1),
  ('rotacao-externa-com-halter-deitado-de-lado', 'banco_reto', 2),
  ('elevacao-em-y-no-banco-inclinado', 'halteres', 1),
  ('elevacao-em-y-no-banco-inclinado', 'banco_ajustavel', 2),
  ('rosca-direta-com-barra-reta', 'barra_reta', 1),
  ('rosca-direta-com-barra-w', 'barra_w', 1),
  ('rosca-direta-na-polia-baixa', 'polia', 1),
  ('rosca-alternada-com-halteres', 'halteres', 1),
  ('rosca-simultanea-com-halteres', 'halteres', 1),
  ('rosca-martelo-com-halteres', 'halteres', 1),
  ('rosca-martelo-cruzada', 'halteres', 1),
  ('rosca-martelo-na-polia-com-corda', 'polia', 1),
  ('rosca-concentrada', 'halteres', 1),
  ('rosca-concentrada', 'banco_reto', 2),
  ('rosca-scott-com-barra-w', 'barra_w', 1),
  ('rosca-scott-com-barra-w', 'banco_scott', 2),
  ('rosca-scott-com-halter-unilateral', 'halteres', 1),
  ('rosca-scott-com-halter-unilateral', 'banco_scott', 2),
  ('rosca-scott-na-maquina', 'rosca_maquina', 1),
  ('rosca-inclinada-com-halteres', 'halteres', 1),
  ('rosca-inclinada-com-halteres', 'banco_ajustavel', 2),
  ('rosca-spider', 'barra_w', 1),
  ('rosca-spider', 'banco_ajustavel', 2),
  ('rosca-na-polia-alta', 'polia', 1),
  ('rosca-unilateral-na-polia', 'polia', 1),
  ('rosca-zottman', 'halteres', 1),
  ('rosca-com-elastico', 'elastico', 1),
  ('rosca-21', 'barra_reta', 1),
  ('triceps-na-polia-com-barra-reta', 'polia', 1),
  ('triceps-na-polia-com-corda', 'polia', 1),
  ('triceps-na-polia-com-barra-v', 'polia', 1),
  ('triceps-unilateral-na-polia', 'polia', 1),
  ('triceps-testa-com-barra-w', 'barra_w', 1),
  ('triceps-testa-com-barra-w', 'banco_reto', 2),
  ('triceps-testa-com-halteres', 'halteres', 1),
  ('triceps-testa-com-halteres', 'banco_reto', 2),
  ('triceps-testa-na-polia', 'polia', 1),
  ('triceps-testa-na-polia', 'banco_reto', 2),
  ('triceps-frances-com-halter', 'halteres', 1),
  ('triceps-frances-unilateral-com-halter', 'halteres', 1),
  ('triceps-frances-na-polia', 'polia', 1),
  ('triceps-coice-com-halter', 'halteres', 1),
  ('triceps-coice-com-halter', 'banco_reto', 2),
  ('triceps-coice-na-polia', 'polia', 1),
  ('triceps-na-maquina', 'triceps_maquina', 1),
  ('supino-fechado-com-barra', 'barra_reta', 1),
  ('supino-fechado-com-barra', 'banco_reto', 2),
  ('supino-fechado-no-smith', 'smith', 1),
  ('supino-fechado-no-smith', 'banco_reto', 2),
  ('mergulho-no-banco', 'banco_reto', 1),
  ('mergulho-nas-paralelas-foco-no-triceps', 'paralelas', 1),
  ('flexao-diamante', 'peso_corporal', 1),
  ('triceps-com-elastico', 'elastico', 1),
  ('triceps-na-polia-com-pegada-supinada', 'polia', 1),
  ('rosca-de-punho-com-barra', 'barra_reta', 1),
  ('rosca-de-punho-com-barra', 'banco_reto', 2),
  ('rosca-de-punho-com-halteres', 'halteres', 1),
  ('rosca-de-punho-com-halteres', 'banco_reto', 2),
  ('rosca-de-punho-inversa-com-barra', 'barra_reta', 1),
  ('rosca-de-punho-inversa-com-barra', 'banco_reto', 2),
  ('rosca-inversa-com-barra-w', 'barra_w', 1),
  ('rosca-inversa-na-polia', 'polia', 1),
  ('pronacao-e-supinacao-com-halter', 'halteres', 1),
  ('pendurado-na-barra-fixa', 'barra_fixa', 1),
  ('rosca-de-punho-inversa-com-halteres', 'halteres', 1),
  ('rosca-de-punho-inversa-com-halteres', 'banco_reto', 2),
  ('abdominal-reto-no-solo', 'peso_corporal', 1),
  ('abdominal-com-anilha', 'anilha', 1),
  ('abdominal-na-maquina', 'abdominal_maquina', 1),
  ('abdominal-na-polia', 'polia', 1),
  ('abdominal-declinado', 'banco_declinado', 1),
  ('abdominal-na-bola-suica', 'bola_suica', 1),
  ('abdominal-infra-no-solo', 'peso_corporal', 1),
  ('elevacao-de-pernas-na-barra-fixa', 'barra_fixa', 1),
  ('elevacao-de-joelhos-na-barra-fixa', 'barra_fixa', 1),
  ('elevacao-de-pernas-na-cadeira-romana', 'cadeira_romana', 1),
  ('elevacao-de-joelhos-na-cadeira-romana', 'cadeira_romana', 1),
  ('abdominal-remador', 'peso_corporal', 1),
  ('abdominal-bicicleta', 'peso_corporal', 1),
  ('abdominal-obliquo-no-solo', 'peso_corporal', 1),
  ('lenhador-na-polia', 'polia', 1),
  ('rotacao-russa', 'peso_corporal', 1),
  ('rotacao-de-tronco-na-maquina', 'rotacao_maquina', 1),
  ('pallof-press', 'polia', 1),
  ('flexao-lateral-de-tronco-com-halter', 'halteres', 1),
  ('abdominal-com-roda', 'roda_abdominal', 1),
  ('prancha-frontal', 'peso_corporal', 1),
  ('prancha-lateral', 'peso_corporal', 1),
  ('hollow-hold', 'peso_corporal', 1),
  ('dead-bug', 'peso_corporal', 1),
  ('elevacao-de-pernas-no-banco', 'banco_reto', 1),
  ('hiperextensao-lombar', 'banco_hiperextensao', 1),
  ('extensao-lombar-na-maquina', 'lombar_maquina', 1),
  ('extensao-lombar-na-bola-suica', 'bola_suica', 1),
  ('superman', 'peso_corporal', 1),
  ('bird-dog', 'peso_corporal', 1),
  ('bom-dia-com-barra', 'barra_reta', 1),
  ('bom-dia-com-barra', 'rack_agachamento', 2),
  ('elevacao-pelvica-com-barra', 'barra_reta', 1),
  ('elevacao-pelvica-com-barra', 'banco_reto', 2),
  ('elevacao-pelvica-no-smith', 'smith', 1),
  ('elevacao-pelvica-no-smith', 'banco_reto', 2),
  ('elevacao-pelvica-na-maquina', 'hip_thrust_maquina', 1),
  ('elevacao-pelvica-com-halter', 'halteres', 1),
  ('elevacao-pelvica-com-halter', 'banco_reto', 2),
  ('elevacao-pelvica-unilateral', 'peso_corporal', 1),
  ('elevacao-pelvica-unilateral', 'banco_reto', 2),
  ('ponte-de-gluteos', 'peso_corporal', 1),
  ('ponte-de-gluteos-unilateral', 'peso_corporal', 1),
  ('coice-na-polia', 'polia', 1),
  ('coice-na-maquina', 'gluteo_maquina', 1),
  ('coice-com-caneleira', 'caneleira', 1),
  ('coice-no-smith', 'smith', 1),
  ('extensao-de-quadril-em-pe-na-polia', 'polia', 1),
  ('agachamento-sumo-com-halter', 'halteres', 1),
  ('subida-no-banco-com-halteres', 'halteres', 1),
  ('subida-no-banco-com-halteres', 'step_caixa', 2),
  ('extensao-de-quadril-no-banco-45', 'banco_hiperextensao', 1),
  ('agachamento-livre-com-barra', 'barra_reta', 1),
  ('agachamento-livre-com-barra', 'rack_agachamento', 2),
  ('agachamento-frontal-com-barra', 'barra_reta', 1),
  ('agachamento-frontal-com-barra', 'rack_agachamento', 2),
  ('agachamento-no-smith', 'smith', 1),
  ('agachamento-hack', 'hack', 1),
  ('agachamento-pendulo', 'pendulo', 1),
  ('leg-press-45', 'leg_press_45', 1),
  ('leg-press-horizontal', 'leg_press_horizontal', 1),
  ('leg-press-unilateral', 'leg_press_45', 1),
  ('cadeira-extensora', 'extensora', 1),
  ('cadeira-extensora-unilateral', 'extensora', 1),
  ('agachamento-goblet', 'kettlebell', 1),
  ('agachamento-com-halteres', 'halteres', 1),
  ('agachamento-bulgaro-com-halteres', 'halteres', 1),
  ('agachamento-bulgaro-com-halteres', 'banco_reto', 2),
  ('agachamento-bulgaro-no-smith', 'smith', 1),
  ('agachamento-bulgaro-no-smith', 'banco_reto', 2),
  ('afundo-estatico-com-halteres', 'halteres', 1),
  ('avanco-com-halteres', 'halteres', 1),
  ('avanco-com-barra', 'barra_reta', 1),
  ('avanco-no-smith', 'smith', 1),
  ('avanco-caminhando', 'halteres', 1),
  ('avanco-reverso', 'halteres', 1),
  ('avanco-lateral', 'halteres', 1),
  ('agachamento-livre-com-peso-corporal', 'peso_corporal', 1),
  ('agachamento-sissy', 'peso_corporal', 1),
  ('agachamento-pistola', 'peso_corporal', 1),
  ('agachamento-isometrico-na-parede', 'peso_corporal', 1),
  ('agachamento-na-maquina', 'hack', 1),
  ('avanco-com-peso-corporal', 'peso_corporal', 1),
  ('mesa-flexora', 'mesa_flexora', 1),
  ('cadeira-flexora', 'cadeira_flexora', 1),
  ('flexora-em-pe', 'flexora_em_pe', 1),
  ('flexora-na-polia', 'polia', 1),
  ('flexora-com-bola-suica', 'bola_suica', 1),
  ('flexao-nordica', 'peso_corporal', 1),
  ('stiff-com-barra', 'barra_reta', 1),
  ('stiff-com-halteres', 'halteres', 1),
  ('stiff-no-smith', 'smith', 1),
  ('stiff-unilateral-com-halter', 'halteres', 1),
  ('levantamento-terra-romeno', 'barra_reta', 1),
  ('levantamento-terra-convencional', 'barra_reta', 1),
  ('levantamento-terra-sumo', 'barra_reta', 1),
  ('levantamento-terra-com-barra-hexagonal', 'barra_hexagonal', 1),
  ('cadeira-adutora', 'cadeira_adutora', 1),
  ('aducao-na-polia', 'polia', 1),
  ('aducao-deitado-de-lado', 'peso_corporal', 1),
  ('aducao-com-bola-entre-os-joelhos', 'bola_suica', 1),
  ('cadeira-abdutora', 'cadeira_abdutora', 1),
  ('abducao-na-polia', 'polia', 1),
  ('abducao-deitado-de-lado-com-caneleira', 'caneleira', 1),
  ('abducao-em-pe-com-elastico', 'elastico', 1),
  ('caminhada-lateral-com-elastico', 'elastico', 1),
  ('concha-com-elastico', 'elastico', 1),
  ('panturrilha-em-pe-na-maquina', 'panturrilha_em_pe', 1),
  ('panturrilha-sentado-na-maquina', 'panturrilha_sentado', 1),
  ('panturrilha-no-leg-press', 'leg_press_45', 1),
  ('panturrilha-no-smith', 'smith', 1),
  ('panturrilha-no-smith', 'step_caixa', 2),
  ('panturrilha-unilateral-com-halter', 'halteres', 1),
  ('panturrilha-unilateral-com-halter', 'step_caixa', 2),
  ('panturrilha-em-pe-com-peso-corporal', 'peso_corporal', 1),
  ('panturrilha-em-pe-com-peso-corporal', 'step_caixa', 2),
  ('elevacao-de-pontas-dos-pes', 'peso_corporal', 1),
  ('encolhimento-com-barra', 'barra_reta', 1),
  ('encolhimento-com-halteres', 'halteres', 1),
  ('encolhimento-no-smith', 'smith', 1),
  ('encolhimento-com-barra-hexagonal', 'barra_hexagonal', 1),
  ('encolhimento-na-polia', 'polia', 1),
  ('encolhimento-na-maquina', 'encolhimento_maquina', 1);

-- ---------------------------------------------------------------------
-- 4. Conferências antes de mexer nos dados
-- ---------------------------------------------------------------------
do $$
declare
  v_missing text;
  v_clash   text;
begin
  -- Todo exercício da 0004 precisa existir; senão a migration para (nada de duplicar).
  select string_agg(c.old_name, ', ') into v_missing
    from _catalog c
   where c.old_name is not null
     and not exists (select 1 from public.exercises e
                      where e.owner_id is null and e.name = c.old_name);
  if v_missing is not null then
    raise exception 'catalog_existing_exercise_missing: %', v_missing;
  end if;

  -- Os pré-definidos que não estão no catálogo seriam esquecidos: parar também.
  select string_agg(e.name, ', ') into v_missing
    from public.exercises e
   where e.owner_id is null
     and not exists (select 1 from _catalog c where c.old_name = e.name);
  if v_missing is not null then
    raise exception 'catalog_predefined_not_mapped: %', v_missing;
  end if;

  -- Exercício de professor com o mesmo nome de um do catálogo não impede nada
  -- (o professor pode ocultar o dele); só avisamos.
  select string_agg(distinct e.name, ', ') into v_clash
    from public.exercises e
    join _catalog c on private.normalize_name(c.name) = e.name_normalized
   where e.owner_id is not null;
  if v_clash is not null then
    raise notice 'catalog_name_clash_with_teacher_exercise: %', v_clash;
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 5. Os 149 existentes: renomear e preencher (o id não muda)
-- ---------------------------------------------------------------------
update public.exercises e
   set name = c.name,
       slug = c.slug,
       muscle_group = c.muscle_group,
       load_mode = c.load_mode,
       measure = c.measure,
       aliases = c.aliases,
       catalog_version = 1
  from _catalog c
 where c.old_name is not null
   and e.owner_id is null
   and e.name = c.old_name;

-- ---------------------------------------------------------------------
-- 6. Os 100 novos
-- ---------------------------------------------------------------------
insert into public.exercises (owner_id, name, slug, muscle_group, load_mode, measure, aliases, catalog_version)
select null, c.name, c.slug, c.muscle_group, c.load_mode, c.measure, c.aliases, 1
  from _catalog c
 where c.old_name is null;

insert into public.exercise_equipment (exercise_id, equipment_slug, position)
select e.id, ce.equipment_slug, ce.position
  from _catalog_equipment ce
  join public.exercises e on e.slug = ce.slug and e.owner_id is null;

drop table _catalog_equipment;
drop table _catalog;

-- ---------------------------------------------------------------------
-- 7. Restrições (só depois dos dados)
-- ---------------------------------------------------------------------
do $$
declare v_bad text;
begin
  if (select count(*) from public.exercises where owner_id is null and slug is not null) <> 249 then
    raise exception 'catalog_count_mismatch';
  end if;
  select string_agg(distinct e.muscle_group, ', ') into v_bad
    from public.exercises e
   where e.muscle_group is not null
     and not exists (select 1 from public.muscle_groups g where g.name = e.muscle_group);
  if v_bad is not null then
    raise exception 'unknown_muscle_group_values: %', v_bad;
  end if;
end $$;

alter table public.exercises
  add constraint exercises_catalog_fields_check
    check ((owner_id is null) = (slug is not null)
       and (owner_id is null) = (catalog_version is not null)),
  add constraint exercises_slug_key unique (slug),
  add constraint exercises_muscle_group_fkey
    foreign key (muscle_group) references public.muscle_groups (name)
    on update restrict on delete restrict;
create index exercises_muscle_group_idx on public.exercises (muscle_group);

-- ---------------------------------------------------------------------
-- 8. Acesso: leitura para quem tem papel; ninguém escreve (só migration)
-- ---------------------------------------------------------------------
alter table public.muscle_groups      enable row level security;
alter table public.equipment          enable row level security;
alter table public.exercise_equipment enable row level security;

create policy muscle_groups_select on public.muscle_groups
  for select to authenticated using (private.my_role() is not null);
create policy equipment_select on public.equipment
  for select to authenticated using (private.my_role() is not null);
-- Herda a visibilidade do exercício (mesmo desenho de workout_days).
create policy exercise_equipment_select on public.exercise_equipment
  for select to authenticated
  using (exists (select 1 from public.exercises e where e.id = exercise_id));

revoke all on public.muscle_groups, public.equipment, public.exercise_equipment
  from anon, authenticated;
grant select on public.muscle_groups, public.equipment, public.exercise_equipment
  to authenticated;

-- ---------------------------------------------------------------------
-- 9. Funções da biblioteca
-- ---------------------------------------------------------------------

-- Busca com acento/caixa ignorados, por nome e por apelido.
create or replace function public.search_exercises(
  p_query text default '', p_hidden_only boolean default false, p_limit integer default 30
) returns setof public.exercises
language sql stable security invoker set search_path = public, extensions as $$
  select e.*
    from (select private.normalize_name(p_query) as n) q
    cross join public.exercises e
   where private.my_role() = 'professor'
     and (case when p_hidden_only
               then exists (select 1 from public.exercise_hidden h
                             where h.teacher_id = (select auth.uid()) and h.exercise_id = e.id)
               else not exists (select 1 from public.exercise_hidden h
                                 where h.teacher_id = (select auth.uid()) and h.exercise_id = e.id)
          end)
     and (q.n = ''
          or strpos(e.name_normalized, q.n) > 0
          or extensions.similarity(e.name_normalized, q.n) > 0.3
          or strpos(e.aliases_normalized, q.n) > 0)
   order by (left(e.name_normalized, length(q.n)) = q.n) desc,
            extensions.similarity(e.name_normalized, q.n) desc,
            e.name_normalized
   limit greatest(least(coalesce(p_limit, 30), 100), 1)
$$;

-- "Já existe um exercício parecido" (regra 74): nome parecido ou apelido igual.
create or replace function public.similar_exercises(p_name text) returns setof public.exercises
language sql stable security invoker set search_path = public, extensions as $$
  select e.*
    from (select private.normalize_name(p_name) as n) q
    cross join public.exercises e
   where private.my_role() = 'professor'
     and q.n <> ''
     and (extensions.similarity(e.name_normalized, q.n) > 0.45
          or strpos(e.name_normalized, q.n) > 0
          or strpos(q.n, e.name_normalized) > 0
          or q.n = any (string_to_array(e.aliases_normalized, ' | ')))
   order by extensions.similarity(e.name_normalized, q.n) desc
   limit 5
$$;

-- Troca de assinatura: a versão de 2 parâmetros sai para não ficar ambígua.
drop function public.create_exercise(text, text);
create function public.create_exercise(
  p_name text, p_muscle_group text default null,
  p_load_mode text default 'required', p_measure text default 'reps'
) returns public.exercises
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid   uuid := auth.uid();
  v_name  text := btrim(regexp_replace(coalesce(p_name, ''), '\s+', ' ', 'g'));
  v_group text := nullif(btrim(coalesce(p_muscle_group, '')), '');
  v_load  text := coalesce(p_load_mode, 'required');
  v_meas  text := coalesce(p_measure, 'reps');
  v_row   public.exercises;
begin
  if private.my_role() is distinct from 'professor' then raise exception 'forbidden'; end if;
  if v_name = '' then raise exception 'name_required'; end if;
  if length(v_name) > 120 then raise exception 'name_too_long'; end if;
  if v_group is not null
     and not exists (select 1 from public.muscle_groups g where g.name = v_group) then
    raise exception 'muscle_group_invalid';
  end if;
  if v_load not in ('required', 'optional', 'none') then raise exception 'load_mode_invalid'; end if;
  if v_meas not in ('reps', 'time') then raise exception 'measure_invalid'; end if;
  if exists (select 1 from public.exercises e
              where e.name_normalized = private.normalize_name(v_name)
                and (e.owner_id is null or e.owner_id = v_uid)) then
    raise exception 'exercise_exists';
  end if;
  insert into public.exercises (owner_id, name, muscle_group, load_mode, measure)
  values (v_uid, v_name, v_group, v_load, v_meas)
  returning * into v_row;
  return v_row;
end $$;
revoke all on function public.create_exercise(text, text, text, text) from public, anon;
grant execute on function public.create_exercise(text, text, text, text) to authenticated;
