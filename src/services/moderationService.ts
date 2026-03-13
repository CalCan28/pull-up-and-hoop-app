import { supabase } from '../lib/supabase';

// ── Types ──────────────────────────────────────────────────────────
export type ReportReason =
  | 'harassment'
  | 'hate_speech'
  | 'spam'
  | 'inappropriate_content'
  | 'fake_stats'
  | 'unsportsmanlike'
  | 'other';

export type ContentType =
  | 'profile'
  | 'game'
  | 'pickup_session'
  | 'rating'
  | 'message';

export interface ContentReport {
  id: string;
  reporter_id: string;
  reported_user_id: string;
  content_type: ContentType;
  content_id: string;
  reason: ReportReason;
  details?: string;
  status: 'pending' | 'reviewed' | 'action_taken' | 'dismissed';
  created_at: string;
}

export interface UserBlock {
  id: string;
  blocker_id: string;
  blocked_id: string;
  created_at: string;
}

// ── Offensive-content filter ───────────────────────────────────────
const OFFENSIVE_PATTERNS: RegExp[] = [
  // Slurs and hate speech (abbreviated patterns — extend as needed)
  /\bn[i1!]gg[ae3]r?s?\b/i,
  /\bf[a@]g+[o0]?t?s?\b/i,
  /\br[e3]t[a@]rd(ed|s)?\b/i,
  /\bk[i1]ke[s]?\b/i,
  /\bsp[i1]c[k]?s?\b/i,
  /\bch[i1]nk[s]?\b/i,
  /\bw[e3]tb[a@]ck[s]?\b/i,
  /\btr[a@]nn[yi1][e3]?s?\b/i,
  /\bcoon[s]?\b/i,

  // Threats / violence
  /\b(kill|murder|shoot|stab|rape)\s+(you|u|him|her|them)\b/i,
  /\bi('?m| am)\s+(going to|gonna|gon)\s+(kill|murder|shoot|stab)\b/i,
  /\bdeath\s+threat/i,

  // Sexual content
  /\bd[i1!]ck\s*(pic|photo|image)/i,
  /\bnud[e3](s|z)\b/i,
  /\bporn(o|ography)?\b/i,
  /\bsex(ting|ual\s+favou?r)/i,

  // Doxxing indicators
  /\b(here'?s|this is)\s+(his|her|their)\s+(address|phone|ssn|social)\b/i,
  /\bdox+(ed|ing)?\b/i,

  // Extreme profanity chains (single words are common in basketball trash talk,
  // but extended/directed abuse gets caught)
  /\bfuck\s*(you|u|off|ing\s+(retard|idiot|loser))\b/i,
  /\bkys\b/i,
  /\bkill\s*your\s*self\b/i,
];

/**
 * Returns `true` when the supplied text matches any offensive pattern.
 * Designed for pre-submit validation on text inputs.
 */
export function containsOffensiveContent(text: string): boolean {
  if (!text) return false;
  return OFFENSIVE_PATTERNS.some((pattern) => pattern.test(text));
}

// ── Report a user / content ────────────────────────────────────────
export async function submitReport({
  reporterId,
  reportedUserId,
  contentType,
  contentId,
  reason,
  details,
}: {
  reporterId: string;
  reportedUserId: string;
  contentType: ContentType;
  contentId: string;
  reason: ReportReason;
  details?: string;
}): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('content_reports').insert({
    reporter_id: reporterId,
    reported_user_id: reportedUserId,
    content_type: contentType,
    content_id: contentId,
    reason,
    details: details?.trim() || null,
    status: 'pending',
  });

  if (error) return { success: false, error: error.message };

  // Best-effort admin notification via Edge Function
  try {
    await supabase.functions.invoke('notify-admin', {
      body: {
        type: 'content_report',
        reporter_id: reporterId,
        reported_user_id: reportedUserId,
        content_type: contentType,
        content_id: contentId,
        reason,
        details,
      },
    });
  } catch {
    // Notification is non-critical — swallow errors
  }

  return { success: true };
}

// ── Block / Unblock ────────────────────────────────────────────────
export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase.from('user_blocks').insert({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });

  if (error) {
    if (error.code === '23505') {
      // Already blocked (unique constraint)
      return { success: true };
    }
    return { success: false, error: error.message };
  }

  // Best-effort admin notification
  try {
    await supabase.functions.invoke('notify-admin', {
      body: {
        type: 'user_block',
        blocker_id: blockerId,
        blocked_id: blockedId,
      },
    });
  } catch {
    // non-critical
  }

  return { success: true };
}

export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ success: boolean; error?: string }> {
  const { error } = await supabase
    .from('user_blocks')
    .delete()
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

export async function getBlockedUserIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_blocks')
    .select('blocked_id')
    .eq('blocker_id', userId);

  return (data || []).map((row) => row.blocked_id);
}

export async function isUserBlocked(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const { data } = await supabase
    .from('user_blocks')
    .select('id')
    .eq('blocker_id', blockerId)
    .eq('blocked_id', blockedId)
    .maybeSingle();

  return !!data;
}
