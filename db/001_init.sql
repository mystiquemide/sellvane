create table if not exists decisions (
  id               bigserial primary key,
  at               timestamptz not null default now(),
  permission_hash  text not null,
  action           text not null check (action in ('SELL','WAIT','SKIP','BLOCKED')),
  reason           text not null,
  source           text not null check (source in ('model','fallback','rule','manual')),
  amount_in        numeric(78,0),
  eth_out          numeric(78,0),
  impact_bps       integer,
  remaining_before numeric(78,0) not null,
  tx_hash          text unique,
  tx_status        text check (tx_status in ('success','reverted')),
  facts            jsonb
);
create index if not exists decisions_perm_at on decisions (permission_hash, at desc);
