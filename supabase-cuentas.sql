-- ════════════════════════════════════════════════════════════════
--  SANTA PERDIDA — Cuentas y partidas guardadas en la nube
--  Pegar entero en Supabase → SQL Editor → Run
--  Proyecto: ivwlobdksywgsxhblppk (el mismo que el marcador de BitFall)
-- ════════════════════════════════════════════════════════════════
--
--  Cada jugador tiene TRES ranuras de partida, como los GTA de siempre.
--  La clave es (jugador, ranura): asi se sube una ranura sin tocar las
--  otras dos.
--
--  La regla de seguridad es simple: solo puedes ver y tocar tus propias
--  filas, y eso lo garantiza la base de datos, no el juego.

-- ── 1. Tabla de partidas ────────────────────────────────────────
create table if not exists public.santa_state (
  user_id     uuid        not null references auth.users(id) on delete cascade,
  slot        smallint    not null default 1,
  state       jsonb       not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  primary key (user_id, slot),
  constraint santa_state_ranura check (slot between 1 and 3),
  -- Una partida ocupa unos pocos kilobytes. El tope evita que alguien
  -- use la cuenta como almacén gratuito.
  constraint santa_state_tamano check (pg_column_size(state) < 512000)
);

-- Si la tabla venia de la version de una sola partida, se le añade la
-- ranura y se rehace la clave primaria sin perder nada.
do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_name = 'santa_state' and column_name = 'slot'
  ) then
    alter table public.santa_state add column slot smallint not null default 1;
    alter table public.santa_state drop constraint if exists santa_state_pkey;
    alter table public.santa_state add primary key (user_id, slot);
    alter table public.santa_state add constraint santa_state_ranura check (slot between 1 and 3);
  end if;
end $$;

-- ── 2. Permisos: cada uno con lo suyo ───────────────────────────
alter table public.santa_state enable row level security;

drop policy if exists "leer solo mis partidas"       on public.santa_state;
drop policy if exists "crear solo mis partidas"      on public.santa_state;
drop policy if exists "actualizar solo mis partidas" on public.santa_state;
drop policy if exists "borrar solo mis partidas"     on public.santa_state;
-- nombres de la version anterior, por si quedaban
drop policy if exists "leer solo mi partida"       on public.santa_state;
drop policy if exists "crear solo mi partida"      on public.santa_state;
drop policy if exists "actualizar solo mi partida" on public.santa_state;
drop policy if exists "borrar solo mi partida"     on public.santa_state;

create policy "leer solo mis partidas"
  on public.santa_state for select
  to authenticated
  using (auth.uid() = user_id);

create policy "crear solo mis partidas"
  on public.santa_state for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "actualizar solo mis partidas"
  on public.santa_state for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "borrar solo mis partidas"
  on public.santa_state for delete
  to authenticated
  using (auth.uid() = user_id);

--  Nadie sin sesión toca esta tabla: no hay ninguna política para el rol
--  anónimo, y con RLS activo lo que no tiene política está prohibido.

-- ── 3. Marca de tiempo automática ───────────────────────────────
create or replace function public.tocar_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists santa_state_updated_at on public.santa_state;
create trigger santa_state_updated_at
  before update on public.santa_state
  for each row execute function public.tocar_updated_at();

-- ── 4. Borrar la propia cuenta ──────────────────────────────────
--  Quien crea una cuenta desde el juego tiene que poder borrarla desde
--  el juego. Borra al usuario que la llama y nada más: el auth.uid() lo
--  pone el servidor a partir del token, no se puede falsificar.
--
--  OJO: la cuenta es la misma para BitFall y para Santa Perdida, asi que
--  borra lo de los dos juegos.
create or replace function public.borrar_mi_cuenta()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  yo uuid := auth.uid();
begin
  if yo is null then
    raise exception 'Hace falta haber iniciado sesión';
  end if;
  delete from public.santa_state where user_id = yo;
  delete from public.user_state  where user_id = yo;
  delete from auth.users where id = yo;
end $$;

revoke all on function public.borrar_mi_cuenta() from public, anon;
grant execute on function public.borrar_mi_cuenta() to authenticated;

-- ════════════════════════════════════════════════════════════════
--  COMPROBAR (desde el SQL Editor, como administrador)
-- ════════════════════════════════════════════════════════════════
--   select tablename, rowsecurity from pg_tables where tablename='santa_state';
--   select policyname, cmd from pg_policies where tablename='santa_state';
--   select user_id, slot, updated_at from public.santa_state order by slot;
