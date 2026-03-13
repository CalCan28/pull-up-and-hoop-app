-- ============================================
-- 010 — Moderation: reports, blocks, terms
-- ============================================

-- Add terms_accepted_at to profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMPTZ;

-- ============================================
-- CONTENT REPORTS
-- ============================================
CREATE TABLE content_reports (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  reported_user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content_type    text NOT NULL CHECK (content_type IN ('profile','game','pickup_session','rating','message')),
  content_id      text NOT NULL,
  reason          text NOT NULL CHECK (reason IN (
    'harassment','hate_speech','spam','inappropriate_content',
    'fake_stats','unsportsmanlike','other'
  )),
  details         text,
  status          text DEFAULT 'pending' CHECK (status IN ('pending','reviewed','action_taken','dismissed')),
  created_at      timestamptz DEFAULT now()
);

CREATE INDEX idx_content_reports_reported ON content_reports(reported_user_id);
CREATE INDEX idx_content_reports_status   ON content_reports(status);
CREATE INDEX idx_content_reports_reporter ON content_reports(reporter_id);

-- ============================================
-- USER BLOCKS
-- ============================================
CREATE TABLE user_blocks (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  blocked_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(blocker_id, blocked_id)
);

CREATE INDEX idx_user_blocks_blocker ON user_blocks(blocker_id);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_blocks     ENABLE ROW LEVEL SECURITY;

-- Reports: users can create (not against self), view their own
CREATE POLICY "Users can create reports (not self)"
  ON content_reports FOR INSERT
  WITH CHECK (
    auth.uid() = reporter_id
    AND reporter_id <> reported_user_id
  );

CREATE POLICY "Users can view own reports"
  ON content_reports FOR SELECT
  USING (auth.uid() = reporter_id);

-- Blocks: users can block others (not self), view own, delete own
CREATE POLICY "Users can block others (not self)"
  ON user_blocks FOR INSERT
  WITH CHECK (
    auth.uid() = blocker_id
    AND blocker_id <> blocked_id
  );

CREATE POLICY "Users can view own blocks"
  ON user_blocks FOR SELECT
  USING (auth.uid() = blocker_id);

CREATE POLICY "Users can unblock"
  ON user_blocks FOR DELETE
  USING (auth.uid() = blocker_id);
