-- SLOGON ACADEMY SUPABASE POSTGRESQL SCHEMA
-- Automatically executed on connect, or can be pasted into Supabase SQL Editor

-- 1. Candidates Table
CREATE TABLE IF NOT EXISTS candidates (
    id SERIAL PRIMARY KEY,
    user_id TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    candidate_name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    role TEXT DEFAULT 'Student',
    active INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE candidates ADD COLUMN IF NOT EXISTS phone TEXT;

-- 2. Question Sets Table
CREATE TABLE IF NOT EXISTS question_sets (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    subject TEXT,
    file_name TEXT,
    file_type TEXT,
    questions_count INTEGER DEFAULT 0,
    duration INTEGER DEFAULT 180,
    status TEXT DEFAULT 'available',
    questions_json JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Sessions Table (for express-session)
CREATE TABLE IF NOT EXISTS sessions (
    sid TEXT PRIMARY KEY,
    sess JSONB NOT NULL,
    expire BIGINT NOT NULL
);

-- Indexes for lightning fast lookups
CREATE INDEX IF NOT EXISTS idx_candidates_user_id ON candidates(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);
