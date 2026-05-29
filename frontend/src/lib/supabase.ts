import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// ═══════════════════════════════════════════
//  MATCH QUERIES
// ═══════════════════════════════════════════

export async function getOpenMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .in("state", ["CREATED", "JOINED", "BETTING_OPEN"])
    .order("created_at", { ascending: false });

  if (error) throw error;
  return data;
}

export async function getMatch(matchId: number) {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", matchId)
    .single();

  if (error) throw error;
  return data;
}

export async function getActiveMatches() {
  const { data, error } = await supabase
    .from("matches")
    .select("*")
    .eq("state", "ACTIVE")
    .order("match_ends_at", { ascending: true });

  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════
//  LIVE SCORES (Realtime)
// ═══════════════════════════════════════════

export function subscribeToLiveScores(
  matchId: number,
  callback: (scores: { player: string; score: number }[]) => void
) {
  return supabase
    .channel(`live-scores-${matchId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "live_scores",
        filter: `match_id=eq.${matchId}`,
      },
      (payload) => {
        // Refetch all scores for this match on any change
        supabase
          .from("live_scores")
          .select("player, score")
          .eq("match_id", matchId)
          .then(({ data }) => {
            if (data) callback(data);
          });
      }
    )
    .subscribe();
}

// ═══════════════════════════════════════════
//  LEADERBOARD
// ═══════════════════════════════════════════

export async function getLeaderboard(limit = 50) {
  const { data, error } = await supabase
    .from("leaderboard")
    .select("*")
    .order("ranking_score", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════
//  MATCH HISTORY
// ═══════════════════════════════════════════

export async function getPlayerHistory(wallet: string, limit = 20) {
  const { data, error } = await supabase
    .from("match_history")
    .select("*")
    .eq("player", wallet)
    .order("played_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════
//  SPECTATOR BETS
// ═══════════════════════════════════════════

export async function getSpectatorBets(matchId: number) {
  const { data, error } = await supabase
    .from("spectator_bets")
    .select("*")
    .eq("match_id", matchId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
}

// ═══════════════════════════════════════════
//  HELPERS
// ═══════════════════════════════════════════

export function formatQIE(weiAmount: string | bigint): string {
  const wei = BigInt(weiAmount);
  const qie = Number(wei) / 1e18;
  return `${qie.toFixed(4)} QIE`;
}

export function formatRank(rankingScore: string | bigint): string {
  const score = BigInt(rankingScore);
  return (Number(score) / 1e16).toFixed(2);
}
