-- RDX Knowledge Store v1 — PostgreSQL design baseline.
-- No database is provisioned by this file.

create extension if not exists pgcrypto;

create type rdx_publication_status as enum (
  'DRAFT', 'SOURCED', 'TESTED', 'RED_TEAMED',
  'VERIFIED', 'LIMITED', 'REJECTED', 'PUBLISHED', 'STALE', 'SUPERSEDED'
);

create type rdx_evidence_relation as enum (
  'SUPPORTS', 'CONTRADICTS', 'QUALIFIES',
  'REPLICATES', 'FAILS_TO_REPLICATE', 'CONTEXT_ONLY'
);

create type rdx_execution_kind as enum ('CALCULATION', 'REAL_TEST', 'SIMULATION');

create table tenants (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  name text not null,
  created_at timestamptz not null default now()
);

create table research_packs (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^RDX-[0-9]{6}$'),
  tenant_id uuid references tenants(id),
  title text not null,
  decision_question text not null,
  vertical text not null,
  scope jsonb not null default '{}'::jsonb,
  status rdx_publication_status not null default 'DRAFT',
  access_class text not null default 'PREVIEW',
  published_version_id uuid,
  review_due_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table claims (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^CLM-[0-9]{6}$'),
  research_pack_id uuid not null references research_packs(id),
  statement text not null,
  scope jsonb not null default '{}'::jsonb,
  evidence_level smallint not null default 0 check (evidence_level between 0 and 8),
  status rdx_publication_status not null default 'DRAFT',
  valid_until timestamptz,
  created_at timestamptz not null default now()
);

create table sources (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^SRC-[0-9]{6}$'),
  title text not null,
  author_or_org text,
  url text,
  source_type text not null,
  published_at timestamptz,
  accessed_at timestamptz not null,
  license_status text not null,
  citation_right text not null,
  storage_right text not null,
  redistribution_right text not null,
  commercial_use_right text not null,
  content_sha256 text,
  independence_group text not null
);

create table evidence (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^EVD-[0-9]{6}$'),
  claim_id uuid not null references claims(id),
  source_id uuid references sources(id),
  relation rdx_evidence_relation not null,
  strength text not null,
  directness text not null,
  extract_locator text,
  audited boolean not null default false,
  created_at timestamptz not null default now(),
  check (source_id is not null)
);

create table executions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique,
  claim_id uuid references claims(id),
  kind rdx_execution_kind not null,
  protocol text not null,
  inputs jsonb not null,
  outputs jsonb,
  artifact_sha256 text,
  reproduced boolean not null default false,
  executed_at timestamptz
);

create table missions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^JOB-[0-9]{6}$'),
  tenant_id uuid references tenants(id),
  research_pack_id uuid references research_packs(id),
  mission_type text not null,
  status text not null default 'QUEUED',
  priority smallint not null default 50 check (priority between 0 and 100),
  budget_limit_eur numeric(12,2) not null default 0,
  allowed_tools jsonb not null default '[]'::jsonb,
  allowed_components jsonb not null default '[]'::jsonb,
  execution_log jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table audits (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^AUD-[0-9]{6}$'),
  research_pack_id uuid not null references research_packs(id),
  decision text not null check (decision in ('ACCEPTED','LIMITED','REJECTED','NEEDS_MORE_EVIDENCE')),
  reviewer_type text not null,
  reviewer_id text not null,
  findings jsonb not null,
  created_at timestamptz not null default now()
);

create table versions (
  id uuid primary key default gen_random_uuid(),
  public_id text not null unique check (public_id ~ '^VER-[0-9]{6}$'),
  research_pack_id uuid not null references research_packs(id),
  previous_version_id uuid references versions(id),
  immutable_manifest jsonb not null,
  manifest_sha256 text not null,
  published_at timestamptz not null default now()
);

alter table research_packs
  add constraint research_packs_published_version_fk
  foreign key (published_version_id) references versions(id);

create table audit_log (
  id bigint generated always as identity primary key,
  tenant_id uuid references tenants(id),
  actor_type text not null,
  actor_id text not null,
  action text not null,
  object_type text not null,
  object_id text not null,
  before_state jsonb,
  after_state jsonb,
  created_at timestamptz not null default now()
);

create index claims_pack_idx on claims(research_pack_id);
create index evidence_claim_idx on evidence(claim_id);
create index missions_queue_idx on missions(status, priority desc, created_at);
create index audit_log_object_idx on audit_log(object_type, object_id, created_at);

