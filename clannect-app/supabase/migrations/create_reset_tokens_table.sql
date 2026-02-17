-- Create reset_tokens table for storing password reset codes
create table if not exists reset_tokens (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  code text not null unique,
  created_at timestamptz default now(),
  expires_at timestamptz not null,
  used_at timestamptz
);

-- Index for faster lookups / Git Update Fix.
create index if not exists idx_reset_tokens_code on reset_tokens(code);
create index if not exists idx_reset_tokens_email on reset_tokens(email);
create index if not exists idx_reset_tokens_expires_at on reset_tokens(expires_at);
