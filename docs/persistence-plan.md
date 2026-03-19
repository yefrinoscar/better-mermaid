# Persistencia de graphs (Supabase + Drizzle)

Este documento deja definido el enfoque pedido:

- **Ahora (v1): simple**
- **Siguiente versión (v2): con historial**

## v1 (simple, implementacion inicial)

Guardar solo el estado actual del graph en una sola tabla: `graphs`.

### Tabla propuesta (`graphs`)

```sql
create table graphs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Untitled graph',
  mermaid_code text not null,
  theme text not null default 'github-dark',
  code_font_size smallint not null default 16 check (code_font_size between 10 and 40),
  transparent boolean not null default false,
  source_preset_id text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index graphs_user_updated_idx on graphs (user_id, updated_at desc);
create index graphs_user_title_idx on graphs (user_id, title);
```

### Modelo en Drizzle (referencia)

```ts
import { boolean, pgTable, text, timestamp, uuid, smallint } from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'

export const graphs = pgTable('graphs', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull(),
  title: text('title').notNull().default('Untitled graph'),
  mermaidCode: text('mermaid_code').notNull(),
  theme: text('theme').notNull().default('github-dark'),
  codeFontSize: smallint('code_font_size').notNull().default(16),
  transparent: boolean('transparent').notNull().default(false),
  sourcePresetId: text('source_preset_id'),
  isDeleted: boolean('is_deleted').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const touchUpdatedAt = sql`now()`
```

### Flujo de guardado v1

- Crear graph: `insert` en `graphs`.
- Editar graph: `update graphs set mermaid_code=?, theme=?, code_font_size=?, transparent=?, updated_at=now()`.
- Listar dashboard: `select * from graphs where user_id = auth.uid() and is_deleted = false order by updated_at desc`.

### RLS minima recomendada (v1)

```sql
alter table graphs enable row level security;

create policy "graphs_select_own"
on graphs for select
using (auth.uid() = user_id);

create policy "graphs_insert_own"
on graphs for insert
with check (auth.uid() = user_id);

create policy "graphs_update_own"
on graphs for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "graphs_delete_own"
on graphs for delete
using (auth.uid() = user_id);
```

## v2 (siguiente version, no implementar ahora)

Agregar historial con `graph_revisions` para snapshots (manuales o automáticos) sin tocar el esquema base de `graphs`.

### Tabla sugerida para v2

```sql
create table graph_revisions (
  id uuid primary key default gen_random_uuid(),
  graph_id uuid not null references graphs(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  revision_no integer not null,
  mermaid_code text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (graph_id, revision_no)
);

create index graph_revisions_graph_created_idx on graph_revisions (graph_id, created_at desc);
```

### Qué cambia en v2

- `graphs` sigue siendo la fuente de estado actual (rápido para UI).
- `graph_revisions` agrega rollback/historial.
- La UI puede mostrar "Versiones" sin cambiar el modelo principal.
