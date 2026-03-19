create table if not exists graphs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  title text not null default 'Untitled graph',
  mermaid_code text not null,
  theme text not null default 'github-dark',
  code_font_size smallint not null default 16,
  transparent boolean not null default false,
  source_preset_id text,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint graphs_code_font_size_check check (code_font_size between 12 and 28)
);

create index if not exists graphs_user_updated_idx on graphs (user_id, updated_at desc);
create index if not exists graphs_user_title_idx on graphs (user_id, title);
