import { getConfig } from "./env";
import type { CrisisSeverity } from "./safety";
import type { MoodAnalysis } from "./mood";

export type TherapyUser = {
  id: string;
  name: string | null;
  preferences: Record<string, unknown> | null;
  session_count: number | null;
};

export type TherapyMemory = {
  id: string;
  user_id: string;
  memory_type: string;
  content: string;
  importance: number;
  last_accessed: string;
  expires_at: string | null;
};

export type TherapyMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
};

export type NewMemoryRow = {
  user_id: string;
  memory_type: string;
  content: string;
  importance: number;
  expires_at: string | null;
};

async function request<T>(
  table: string,
  query = "",
  init: RequestInit = {},
): Promise<T> {
  const config = getConfig();
  const response = await fetch(
    `${config.supabaseUrl}/rest/v1/${table}${query ? `?${query}` : ""}`,
    {
      ...init,
      headers: {
        apikey: config.supabaseServiceRoleKey,
        Authorization: `Bearer ${config.supabaseServiceRoleKey}`,
        "Content-Type": "application/json",
        ...(init.headers || {}),
      },
    },
  );

  if (!response.ok) {
    const details = (await response.text()).slice(0, 600);
    throw new Error(`Supabase ${table} request failed (${response.status}): ${details}`);
  }

  if (response.status === 204) return undefined as T;
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export async function ensureUser(userId: string) {
  const query = new URLSearchParams({ on_conflict: "id" }).toString();
  await request("therapy_users", query, {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=minimal" },
    body: JSON.stringify({ id: userId }),
  });
}

export async function getUser(userId: string) {
  const query = new URLSearchParams({
    id: `eq.${userId}`,
    select: "id,name,preferences,session_count",
    limit: "1",
  }).toString();
  const rows = await request<TherapyUser[]>("therapy_users", query);
  return rows[0] || null;
}

export async function updateUserName(userId: string, name: string) {
  const query = new URLSearchParams({ id: `eq.${userId}` }).toString();
  await request("therapy_users", query, {
    method: "PATCH",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ name, updated_at: new Date().toISOString() }),
  });
}

export async function getTopMemories(userId: string) {
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    select: "id,user_id,memory_type,content,importance,last_accessed,expires_at",
    order: "importance.desc,last_accessed.desc",
    limit: "10",
  }).toString();
  return request<TherapyMemory[]>("therapy_memories", query);
}

export async function getHistory(userId: string, sessionId: string) {
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    session_id: `eq.${sessionId}`,
    select: "role,content,created_at",
    order: "created_at.asc",
    limit: "20",
  }).toString();
  return request<TherapyMessage[]>("therapy_messages", query);
}

export async function saveMessage(
  userId: string,
  sessionId: string,
  role: "user" | "assistant",
  content: string,
) {
  await request("therapy_messages", "", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      session_id: sessionId,
      user_id: userId,
      role,
      content,
    }),
  });
}

export async function saveCrisisLog(
  userId: string,
  sessionId: string,
  message: string,
  severity: CrisisSeverity,
) {
  await request("therapy_crisis_logs", "", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      session_id: sessionId,
      message,
      severity,
    }),
  });
}

export async function saveMoodLog(
  userId: string,
  sessionId: string,
  message: string,
  analysis: MoodAnalysis,
) {
  await request("therapy_mood_logs", "", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      user_id: userId,
      session_id: sessionId,
      message,
      mood: analysis.mood,
      confidence: analysis.confidence,
      sentiment_score: analysis.sentiment_score,
    }),
  });
}

export async function saveMemories(rows: NewMemoryRow[]) {
  if (rows.length === 0) return;
  await request("therapy_memories", "", {
    method: "POST",
    headers: { Prefer: "return=minimal" },
    body: JSON.stringify(rows),
  });
}

export async function deleteExpiredMemories(userId: string) {
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    expires_at: `lt.${new Date().toISOString()}`,
  }).toString();
  await request("therapy_memories", query, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}

export async function deleteMemoriesByIds(userId: string, ids: string[]) {
  const safeIds = ids.filter((id) => /^[0-9a-f-]{20,50}$/i.test(id));
  if (safeIds.length === 0) return;
  const query = new URLSearchParams({
    user_id: `eq.${userId}`,
    id: `in.(${safeIds.join(",")})`,
  }).toString();
  await request("therapy_memories", query, {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
}
