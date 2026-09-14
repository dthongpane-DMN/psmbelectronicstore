-- PBSM Stock & Billing — ສ້າງຕາຕະລາງໃນ Supabase (SQL Editor → Run)
create table if not exists cbf_docs (
  id          text primary key,
  coll        text not null,
  data        jsonb not null default '{}'::jsonb,
  deleted     boolean not null default false,
  updated_at  timestamptz not null default now()
);
create index if not exists cbf_docs_coll_idx on cbf_docs (coll);
create index if not exists cbf_docs_upd_idx  on cbf_docs (updated_at);
alter table cbf_docs enable row level security;
drop policy if exists cbf_docs_all on cbf_docs;
create policy cbf_docs_all on cbf_docs
  for all to anon using (true) with check (true);
