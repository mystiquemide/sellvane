-- Every token with a Sellvane cap. Rows are only inserted after the permission is verified on chain.
create table if not exists tokens (
  slug            text primary key,              -- lowercase token address
  token           text not null,
  symbol          text not null,
  name            text not null,
  decimals        integer not null,
  total_supply    numeric(78,0) not null,
  pool            text not null,
  pool_fee        integer not null,
  team_account    text not null,
  permission      jsonb not null,
  permission_hash text not null unique,
  max_impact_bps  integer not null default 100,
  min_slice_bps   integer not null default 100,
  deploy_block    bigint not null,
  status          text not null default 'active' check (status in ('active','revoked','expired')),
  created_at      timestamptz not null default now()
);
