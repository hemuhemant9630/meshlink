CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  headline TEXT DEFAULT '',
  city TEXT DEFAULT '',
  company TEXT DEFAULT '',
  role TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  certifications TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  years_exp INT DEFAULT 0,
  open_to_work BOOLEAN DEFAULT FALSE,
  hiring BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS groups (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT DEFAULT '',
  topic TEXT DEFAULT 'General',
  owner_id INT REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS group_members (
  group_id INT REFERENCES groups(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',
  joined_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (group_id, user_id)
);
CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  author_id INT REFERENCES users(id) ON DELETE CASCADE,
  group_id INT REFERENCES groups(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  topic TEXT DEFAULT 'General',
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS posts_created_idx ON posts(created_at DESC);
CREATE TABLE IF NOT EXISTS post_likes (
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);
CREATE TABLE IF NOT EXISTS comments (
  id SERIAL PRIMARY KEY,
  post_id INT REFERENCES posts(id) ON DELETE CASCADE,
  author_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS connections (
  id SERIAL PRIMARY KEY,
  requester_id INT REFERENCES users(id) ON DELETE CASCADE,
  addressee_id INT REFERENCES users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (requester_id, addressee_id)
);
CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INT REFERENCES users(id) ON DELETE CASCADE,
  recipient_id INT REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_pair_idx ON messages(sender_id, recipient_id, created_at);
CREATE TABLE IF NOT EXISTS events (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  city TEXT DEFAULT '',
  venue TEXT DEFAULT '',
  is_online BOOLEAN DEFAULT FALSE,
  starts_at TIMESTAMPTZ NOT NULL,
  capacity INT DEFAULT 0,
  organizer_id INT REFERENCES users(id) ON DELETE SET NULL,
  group_id INT REFERENCES groups(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS event_rsvps (
  event_id INT REFERENCES events(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (event_id, user_id)
);
CREATE TABLE IF NOT EXISTS jobs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  company TEXT NOT NULL,
  city TEXT DEFAULT '',
  work_mode TEXT DEFAULT 'Hybrid',
  job_type TEXT DEFAULT 'Full-time',
  experience TEXT DEFAULT '',
  salary TEXT DEFAULT '',
  skills TEXT[] DEFAULT '{}',
  description TEXT DEFAULT '',
  poster_id INT REFERENCES users(id) ON DELETE CASCADE,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE TABLE IF NOT EXISTS job_applications (
  id SERIAL PRIMARY KEY,
  job_id INT REFERENCES jobs(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  note TEXT DEFAULT '',
  status TEXT DEFAULT 'Applied',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (job_id, user_id)
);
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  actor_id INT REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  link TEXT DEFAULT '/',
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_idx ON notifications(user_id, created_at DESC);
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'meshlink';
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS external_url TEXT;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS posted_at TIMESTAMPTZ;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_ext_idx ON jobs(source, external_id);
ALTER TABLE events ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'meshlink';
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_id TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS external_url TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS events_source_ext_idx ON events(source, external_id);
CREATE TABLE IF NOT EXISTS import_runs (
  id SERIAL PRIMARY KEY,
  ran_at TIMESTAMPTZ DEFAULT now(),
  trigger TEXT DEFAULT 'cron',
  stats JSONB
);
