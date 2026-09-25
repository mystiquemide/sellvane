-- Incremental chain scan progress, so each request only reads blocks it has not seen.
create table if not exists scan_cache (
  key        text primary key,
  to_block   bigint not null,
  payload    jsonb not null,
  updated_at timestamptz not null default now()
);
