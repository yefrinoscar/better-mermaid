# Better Mermaid Dashboard

A small Next.js 16 dashboard for editing Mermaid and seeing the graph as large as possible.

## Stack

- `next@16.2.0`
- `react@19`
- `beautiful-mermaid@1.1.3`

## UI goal

- horizontal tabs on top
- compact controls and metadata
- most of the page dedicated to the graph preview
- small editor dock at the bottom

## Run locally

```bash
npm install
npm run dev
```

## Production build

```bash
npm run build
npm run start
```

## Persistencia (Supabase + Drizzle)

- Plan documentado en `docs/persistence-plan.md`
- v1 simple: una sola tabla `graphs`
- v2 futura: tabla `graph_revisions` para historial

### Setup rapido

1. Copia `.env.example` a `.env.local` y agrega:
   - `DATABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
2. Crea la tabla con SQL directo (`db/001_graphs.sql`) o usa Drizzle.
3. Para Drizzle usa:

```bash
npm run db:generate
npm run db:push
```

La app sincroniza los graphs del cliente con `GET/POST /api/graphs`.

### Auth

- Login con email/password desde la barra superior.
- El API usa sesión Supabase para resolver `user.id`.
- Ya no se usa `x-owner-id`.

### RLS notes

- SQL de RLS: `db/002_graphs_rls.sql`
- Recomendado: mantener RLS en SQL versionado (repo) y aplicarlo en tu pipeline de migraciones, no manualmente en el dashboard.
