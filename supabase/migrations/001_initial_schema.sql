-- ═══════════════════════════════════════════════════════════════
-- Q.I.A (QIE Intelligent Agent) — Supabase Schema
-- Off-chain data for live scoring, lobby browsing, and analytics
-- ═══════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────
-- PROFILES (synced from on-chain PlayerAccount)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    wallet_address  TEXT UNIQUE NOT NULL,       -- EVM address (checksummed)
    display_name    TEXT,
    avatar_url      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_profiles_wallet ON profiles(wallet_address);

-- ─────────────────────────────────────────
-- MATCHES (on-chain mirror + off-chain metadata)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS matches (
    id                  BIGINT PRIMARY KEY,         -- on-chain matchId
    player_a            TEXT NOT NULL,               -- wallet address
    player_b            TEXT,                        -- null until joined
    bet_amount_wei      TEXT NOT NULL,               -- string to handle uint256
    state               TEXT NOT NULL DEFAULT 'CREATED',
    -- Timing
    duration_seconds    INT NOT NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    betting_opens_at    TIMESTAMPTZ,
    betting_locks_at    TIMESTAMPTZ,
    match_starts_at     TIMESTAMPTZ,
    match_ends_at       TIMESTAMPTZ,
    resolved_at         TIMESTAMPTZ,
    -- Scores (off-chain mirror, signed on-chain)
    score_a             INT DEFAULT 0,
    score_b             INT DEFAULT 0,
    -- Tiebreaker
    tiebreaker_distance_a TEXT,                     -- fixed-point string
    tiebreaker_distance_b TEXT,
    -- Result
    winner              TEXT,                        -- wallet address
    -- Spectator pools (off-chain mirror)
    spectator_pool_a_wei TEXT DEFAULT '0',
    spectator_pool_b_wei TEXT DEFAULT '0',
    -- Blockchain metadata
    tx_hash_created     TEXT,
    tx_hash_resolved    TEXT,
    chain_id            INT NOT NULL DEFAULT 1983   -- QIE testnet
);

CREATE INDEX idx_matches_state ON matches(state);
CREATE INDEX idx_matches_player_a ON matches(player_a);
CREATE INDEX idx_matches_player_b ON matches(player_b);
CREATE INDEX idx_matches_created ON matches(created_at DESC);

-- ─────────────────────────────────────────
-- LIVE SCORES (Supabase Realtime)
-- Updated during active matches from Unity client
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS live_scores (
    id          BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id    BIGINT NOT NULL REFERENCES matches(id),
    player      TEXT NOT NULL,                      -- wallet address
    score       INT NOT NULL DEFAULT 0,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_live_scores_match_player ON live_scores(match_id, player);
CREATE INDEX idx_live_scores_match ON live_scores(match_id);

-- ─────────────────────────────────────────
-- SPECTATOR BETS (off-chain mirror for UI)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS spectator_bets (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id        BIGINT NOT NULL REFERENCES matches(id),
    bettor          TEXT NOT NULL,                  -- wallet address
    side            TEXT NOT NULL CHECK (side IN ('A', 'B')),
    amount_wei      TEXT NOT NULL,
    is_queued       BOOLEAN DEFAULT FALSE,
    tx_hash         TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_spectator_bets_match ON spectator_bets(match_id);
CREATE INDEX idx_spectator_bets_bettor ON spectator_bets(bettor);

-- ─────────────────────────────────────────
-- LEADERBOARD (denormalized for fast reads)
-- Synced from on-chain LeaderboardRegistry
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS leaderboard (
    wallet_address      TEXT PRIMARY KEY,
    display_name        TEXT,
    max_score           BIGINT DEFAULT 0,
    total_qie_winnings  TEXT DEFAULT '0',           -- wei string
    wins                INT DEFAULT 0,
    losses              INT DEFAULT 0,
    total_matches       INT DEFAULT 0,
    ranking_score       TEXT DEFAULT '0',           -- fixed-point string
    last_match_at       TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leaderboard_ranking ON leaderboard(ranking_score DESC);
CREATE INDEX idx_leaderboard_score ON leaderboard(max_score DESC);
CREATE INDEX idx_leaderboard_winnings ON leaderboard(total_qie_winnings DESC);

-- ─────────────────────────────────────────
-- MATCH HISTORY (player perspective, for profile pages)
-- ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS match_history (
    id              BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    match_id        BIGINT NOT NULL REFERENCES matches(id),
    player          TEXT NOT NULL,
    opponent        TEXT NOT NULL,
    player_score    INT NOT NULL,
    opponent_score  INT NOT NULL,
    is_winner       BOOLEAN NOT NULL,
    bet_amount_wei  TEXT NOT NULL,
    winnings_wei    TEXT DEFAULT '0',
    played_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_match_history_player ON match_history(player, played_at DESC);

-- ─────────────────────────────────────────
-- RLS POLICIES (Row Level Security)
-- ─────────────────────────────────────────

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE spectator_bets ENABLE ROW LEVEL SECURITY;
ALTER TABLE leaderboard ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_history ENABLE ROW LEVEL SECURITY;

-- Public read for lobby, leaderboard, match history
CREATE POLICY "Public read matches" ON matches FOR SELECT USING (true);
CREATE POLICY "Public read leaderboard" ON leaderboard FOR SELECT USING (true);
CREATE POLICY "Public read match_history" ON match_history FOR SELECT USING (true);
CREATE POLICY "Public read spectator_bets" ON spectator_bets FOR SELECT USING (true);
CREATE POLICY "Public read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Public read live_scores" ON live_scores FOR SELECT USING (true);

-- Service role can insert/update (backend API)
CREATE POLICY "Service insert matches" ON matches FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update matches" ON matches FOR UPDATE USING (true);
CREATE POLICY "Service insert live_scores" ON live_scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update live_scores" ON live_scores FOR UPDATE USING (true);
CREATE POLICY "Service insert spectator_bets" ON spectator_bets FOR INSERT WITH CHECK (true);
CREATE POLICY "Service upsert leaderboard" ON leaderboard FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update leaderboard" ON leaderboard FOR UPDATE USING (true);
CREATE POLICY "Service insert match_history" ON match_history FOR INSERT WITH CHECK (true);
CREATE POLICY "Service upsert profiles" ON profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Service update profiles" ON profiles FOR UPDATE USING (true);

-- ─────────────────────────────────────────
-- REALTIME SUBSCRIPTIONS
-- ─────────────────────────────────────────
-- Enable realtime for live score updates
ALTER PUBLICATION supabase_realtime ADD TABLE live_scores;
ALTER PUBLICATION supabase_realtime ADD TABLE matches;

-- ─────────────────────────────────────────
-- FUNCTIONS
-- ─────────────────────────────────────────

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_profiles_updated
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_leaderboard_updated
    BEFORE UPDATE ON leaderboard
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to sync leaderboard from on-chain data
CREATE OR REPLACE FUNCTION sync_leaderboard(
    p_wallet TEXT,
    p_max_score BIGINT,
    p_total_qie TEXT,
    p_wins INT,
    p_losses INT,
    p_total_matches INT,
    p_ranking_score TEXT
) RETURNS VOID AS $$
BEGIN
    INSERT INTO leaderboard (wallet_address, max_score, total_qie_winnings, wins, losses, total_matches, ranking_score, last_match_at)
    VALUES (p_wallet, p_max_score, p_total_qie, p_wins, p_losses, p_total_matches, p_ranking_score, NOW())
    ON CONFLICT (wallet_address) DO UPDATE SET
        max_score = GREATEST(leaderboard.max_score, EXCLUDED.max_score),
        total_qie_winnings = EXCLUDED.total_qie_winnings,
        wins = EXCLUDED.wins,
        losses = EXCLUDED.losses,
        total_matches = EXCLUDED.total_matches,
        ranking_score = EXCLUDED.ranking_score,
        last_match_at = NOW(),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql;
