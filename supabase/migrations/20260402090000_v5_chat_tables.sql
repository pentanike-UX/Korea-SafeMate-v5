-- ============================================================
-- v5 Chat: Conversations · Messages · Saved Plans
-- ============================================================
-- 적용 방법:
--   supabase db push                     (로컬 Supabase CLI)
--   또는 Supabase 대시보드 → SQL Editor에 붙여넣기
-- ============================================================

-- ── 1. Conversations ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v5_conversations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       TEXT NOT NULL DEFAULT '새 대화',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 최신 대화 먼저 정렬
CREATE INDEX IF NOT EXISTS v5_conversations_user_updated
  ON public.v5_conversations (user_id, updated_at DESC);

-- ── 2. Messages ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v5_messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.v5_conversations(id) ON DELETE CASCADE,
  role            TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content         TEXT NOT NULL,
  travel_plan     JSONB,        -- TravelPlan 객체 전체 (nullable)
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS v5_messages_conv_created
  ON public.v5_messages (conversation_id, created_at ASC);

-- ── 3. Saved Plans ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.v5_saved_plans (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  from_conversation_id  UUID REFERENCES public.v5_conversations(id) ON DELETE SET NULL,
  plan_id               TEXT NOT NULL,          -- TravelPlan.id (클라이언트 ID)
  title                 TEXT NOT NULL,
  region                TEXT NOT NULL,
  plan_data             JSONB NOT NULL,          -- TravelPlan 전체
  saved_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS v5_saved_plans_user_saved
  ON public.v5_saved_plans (user_id, saved_at DESC);

-- ── 4. RLS (Row Level Security) ──────────────────────────────
-- 반드시 활성화 — 다른 사용자 데이터 열람 차단

ALTER TABLE public.v5_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v5_messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.v5_saved_plans   ENABLE ROW LEVEL SECURITY;

-- Conversations: 본인 것만 CRUD
DROP POLICY IF EXISTS "v5_conv_owner" ON public.v5_conversations;
CREATE POLICY "v5_conv_owner" ON public.v5_conversations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Messages: 본인 대화 내 메시지만
DROP POLICY IF EXISTS "v5_msg_owner" ON public.v5_messages;
CREATE POLICY "v5_msg_owner" ON public.v5_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.v5_conversations c
      WHERE c.id = conversation_id AND c.user_id = auth.uid()
    )
  );

-- Saved plans: 본인 것만
DROP POLICY IF EXISTS "v5_plan_owner" ON public.v5_saved_plans;
CREATE POLICY "v5_plan_owner" ON public.v5_saved_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 5. updated_at 자동 갱신 트리거 ──────────────────────────
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS v5_conversations_updated_at ON public.v5_conversations;
CREATE TRIGGER v5_conversations_updated_at
  BEFORE UPDATE ON public.v5_conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
