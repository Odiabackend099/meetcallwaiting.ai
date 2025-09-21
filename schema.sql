-- Supabase database schema for Callwaiting AI
-- Execute these statements in the Supabase SQL Editor

-- Create custom enum types
create type if not exists order_status as enum ('pending_payment','paid','failed');

create type if not exists appt_status as enum ('proposed','confirmed','cancelled');

-- Create merchants table
create table if not exists merchants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text not null,
  country text not null,
  timezone text not null,
  currency text not null,
  website text,
  owner_phone text,
  billing_email text,
  sender_email text,
  appointment_provider text,
  calendly_link text,
  google_calendar_id text,
  number_assigned text,
  settings jsonb default '{}'::jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create orders table
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  customer_phone text,
  items jsonb default '[]'::jsonb,
  total numeric(12,2),
  currency text,
  payment_link_id text,
  payment_link_url text,
  status order_status not null default 'pending_payment',
  paid_at timestamptz,
  recording_url text,
  transcript text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create appointments table
create table if not exists appointments (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  customer_phone text,
  service text,
  starts_at timestamptz,
  ends_at timestamptz,
  location text,
  status appt_status not null default 'proposed',
  provider_ref text,
  notes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create consents table
create table if not exists consents (
  id uuid primary key default gen_random_uuid(),
  merchant_id uuid references merchants(id) on delete cascade,
  channel text check (channel in ('sms','whatsapp','email')),
  target text not null,
  source text check (source in ('ivr','web')) not null,
  ts timestamptz default now()
);

-- Create events table
create table if not exists events (
  id uuid primary key default gen_random_uuid(),
  type text not null,
  ref_id text,
  request_id text,
  payload jsonb,
  created_at timestamptz default now()
);

-- Create stripe_events table
create table if not exists stripe_events (
  event_id text primary key,
  type text not null,
  order_id uuid,
  received_at timestamptz default now()
);

-- Create updated_at trigger function
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language 'plpgsql';

-- Create triggers for updated_at columns
create trigger update_merchants_updated_at before update
  on merchants for each row execute procedure update_updated_at_column();

create trigger update_orders_updated_at before update
  on orders for each row execute procedure update_updated_at_column();

create trigger update_appointments_updated_at before update
  on appointments for each row execute procedure update_updated_at_column();

-- Enable Row Level Security (RLS) on all tables
alter table merchants enable row level security;
alter table orders enable row level security;
alter table appointments enable row level security;
alter table consents enable row level security;
alter table events enable row level security;
alter table stripe_events enable row level security;

-- Create policies for merchants (example - adjust as needed)
create policy "Merchants are viewable by everyone" on merchants
  for select using (true);

create policy "Merchants can be created by everyone" on merchants
  for insert with check (true);

-- Create policies for orders (example - adjust as needed)
create policy "Orders are viewable by everyone" on orders
  for select using (true);

create policy "Orders can be created by everyone" on orders
  for insert with check (true);

-- Create policies for appointments (example - adjust as needed)
create policy "Appointments are viewable by everyone" on appointments
  for select using (true);

create policy "Appointments can be created by everyone" on appointments
  for insert with check (true);

-- Create policies for consents (example - adjust as needed)
create policy "Consents are viewable by everyone" on consents
  for select using (true);

create policy "Consents can be created by everyone" on consents
  for insert with check (true);

-- Create policies for events (example - adjust as needed)
create policy "Events are viewable by everyone" on events
  for select using (true);

create policy "Events can be created by everyone" on events
  for insert with check (true);

-- Create policies for stripe_events (example - adjust as needed)
create policy "Stripe events are viewable by everyone" on stripe_events
  for select using (true);

create policy "Stripe events can be created by everyone" on stripe_events
  for insert with check (true);

-- Grant necessary permissions
grant usage on schema public to anon, authenticated;
grant all on all tables in schema public to anon, authenticated;
grant all on all sequences in schema public to anon, authenticated;
grant all on all functions in schema public to anon, authenticated;