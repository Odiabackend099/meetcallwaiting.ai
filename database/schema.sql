create type order_status as enum ('pending_payment','paid','failed');
create type appt_status  as enum ('proposed','confirmed','cancelled');

create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  country text not null,
  timezone text not null,
  currency text not null,
  website text,
  owner_phone text not null,
  billing_email text not null,
  sender_email text,
  appointment_provider text,        -- 'calendly' | 'google'
  calendly_link text,
  google_calendar_id text,
  number_assigned text,             -- Twilio E.164
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  customer_phone text,
  items jsonb default '[]'::jsonb,
  total numeric(12,2),
  currency text,
  payment_link_id text,             -- Stripe payment link id
  payment_link_url text,
  status order_status not null default 'pending_payment',
  paid_at timestamptz,
  recording_url text,
  transcript text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  customer_phone text,
  service text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  status appt_status not null default 'proposed',
  provider_ref text,                -- calendly/Google event id
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  channel text check (channel in ('sms','whatsapp','email')),
  target text not null,
  source text check (source in ('ivr','web')) not null,
  ts timestamptz default now()
);

create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  ref_id text,
  request_id text,
  payload jsonb,
  created_at timestamptz default now()
);

-- Idempotency / webhook ledger
create table if not exists stripe_events (
  event_id text primary key,
  type text not null,
  order_id uuid,
  received_at timestamptz default now()
);

-- Updated_at triggers
create or replace function touch_updated_at() returns trigger as $$
begin new.updated_at = now(); return new; end; $$ language plpgsql;

drop trigger if exists t_upd_merchants on merchants;
create trigger t_upd_merchants before update on merchants
for each row execute procedure touch_updated_at();

drop trigger if exists t_upd_orders on orders;
create trigger t_upd_orders before update on orders
for each row execute procedure touch_updated_at();

drop trigger if exists t_upd_appointments on appointments;
create trigger t_upd_appointments before update on appointments
for each row execute procedure touch_updated_at();