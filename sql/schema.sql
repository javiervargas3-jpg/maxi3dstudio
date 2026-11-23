-- LUMEN // FORM · esquema Supabase (v2)
-- Pégalo completo en Supabase > SQL Editor > Run

create extension if not exists pgcrypto;

create table if not exists public.categorias (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  nombre text not null,
  orden int not null default 0,
  hue int not null default 150
);

create table if not exists public.productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  descripcion text,
  categoria_id uuid references public.categorias(id) on delete set null,
  autor text not null default 'Lumen Form',
  imagen_url text,
  precio int not null default 0,          -- CLP
  descargas int not null default 0,
  likes int not null default 0,
  con_luz boolean not null default false, -- muestra el interruptor ON/OFF
  luz_on boolean not null default true,
  activo boolean not null default true,
  created_at timestamptz not null default now()
);
alter table public.productos add column if not exists descripcion text;

-- Pedidos del carrito (el total es informativo: lo confirmas tú por WhatsApp)
create table if not exists public.ordenes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  nombre text not null check (char_length(nombre) between 1 and 80),
  contacto text not null check (char_length(contacto) between 3 and 120),
  nota text check (char_length(nota) <= 500),
  items jsonb not null,
  total int not null default 0,
  estado text not null default 'recibido',
  created_at timestamptz not null default now()
);

alter table public.categorias enable row level security;
alter table public.productos  enable row level security;
alter table public.ordenes    enable row level security;

drop policy if exists "categorias publicas" on public.categorias;
create policy "categorias publicas" on public.categorias for select using (true);

drop policy if exists "productos publicos" on public.productos;
create policy "productos publicos" on public.productos for select using (activo);

-- Cualquiera puede enviar un pedido; nadie puede leerlos salvo tú desde el panel
-- (y cada usuario logueado ve solo los suyos)
drop policy if exists "enviar orden" on public.ordenes;
create policy "enviar orden" on public.ordenes for insert to anon, authenticated
  with check (estado = 'recibido' and (user_id is null or user_id = auth.uid()));

drop policy if exists "ver ordenes propias" on public.ordenes;
create policy "ver ordenes propias" on public.ordenes for select to authenticated
  using (user_id = auth.uid());

do $$ begin
  alter publication supabase_realtime add table public.productos;
exception when duplicate_object then null; end $$;

-- Datos de ejemplo
insert into public.categorias (slug, nombre, orden, hue) values
  ('lamparas',   'Lámparas 3D',                  1, 38),
  ('decoracion', 'Decoración de Interior',       2, 190),
  ('juguetes',   'Juguetes & Gadgets',           3, 150),
  ('otros',      'Otros Modelos (STL / .3MF)',   4, 270)
on conflict (slug) do nothing;

insert into public.productos (nombre, descripcion, categoria_id, precio, descargas, likes, con_luz)
select v.nombre, v.descripcion, c.id, v.precio, v.descargas, v.likes, v.con_luz
from (values
  ('Lámpara de espiral E27',  'Pantalla de líneas en espiral que difunde una luz cálida. Para ampolleta E27.', 'lamparas', 24990, 5600, 2800, true),
  ('Luz nocturna de hadas',   'Figura calada que proyecta puntos de luz en la pared. Ideal para piezas infantiles.', 'lamparas', 14990, 3900, 3700, true),
  ('Lámpara Luna 3D',         'Esfera con relieve de cráteres que se ilumina desde dentro.', 'lamparas', 19990, 5600, 2600, true),
  ('Luna doble',              'Dos lunas de distinto tamaño para escritorio o repisa.', 'lamparas', 29990, 5600, 2600, true),
  ('Lámpara de suspensión',   'Pantalla colgante de textura tejida para sobre mesa o comedor.', 'lamparas', 27990, 4400, 4900, true),
  ('Sujetalibros geométrico', 'Par de sujetalibros de líneas geométricas, livianos y firmes.', 'decoracion', 12990, 3900, 9700, false),
  ('Dragón articulado flexi', 'Dragón que se imprime ya articulado, listo para jugar.', 'juguetes', 8990, 3300, 2800, false),
  ('Soporte de auriculares',  'Soporte simple para dejar tus auriculares a mano.', 'otros', 9990, 1200, 640, false)
) as v(nombre, descripcion, slug, precio, descargas, likes, con_luz)
join public.categorias c on c.slug = v.slug
where not exists (select 1 from public.productos);
