import { json, isSafeId } from "../server/http";
import { analyzeMood } from "../server/mood";
import { crisisResponse, detectCrisis } from "../server/safety";
import { generateTherapistResponse } from "../server/groq";
import { parseModelResponse, prepareMemoryRows } from "../server/memory";
import {
  deleteExpiredMemories,
  deleteMemoriesByIds,
  ensureUser,
  getHistory,
  getTopMemories,
  getUser,
  saveCrisisLog,
  saveMemories,
  saveMessage,
  saveMoodLog,
  updateUserName,
} from "../server/supabase";

export const maxDuration = 60;

export default async function handler(request: Request) {
  if (request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const body = await request.json();
    const userId = body?.userId;
    const sessionId = body?.sessionId;
    const message = String(body?.chatInput || "").trim();
    const reportedMood = String(body?.mood || "neutral").trim().slice(0, 40);

    if (!isSafeId(userId) || !isSafeId(sessionId) || !message) {
      return json({ error: "userId, sessionId and chatInput are required" }, 400);
    }

    if (message.length > 4000) {
      return json({ error: "Message is too long" }, 413);
    }

    const crisis = detectCrisis(message);
    const mood = analyzeMood(message);

    if (crisis.detected && crisis.severity) {
      const output = crisisResponse(crisis.severity);

      const logging = await Promise.allSettled([
        ensureUser(userId),
        saveCrisisLog(userId, sessionId, message, crisis.severity),
        saveMessage(userId, sessionId, "user", message),
        saveMessage(userId, sessionId, "assistant", output),
        saveMoodLog(userId, sessionId, message, mood),
      ]);

      for (const result of logging) {
        if (result.status === "rejected") {
          console.error("Crisis logging warning:", result.reason);
        }
      }

      return json({
        output,
        crisis_detected: true,
        severity: crisis.severity,
      });
    }

    let user = null;
    let memories = [] as Awaited<ReturnType<typeof getTopMemories>>;
    let history = [] as Awaited<ReturnType<typeof getHistory>>;

    try {
      await ensureUser(userId);
      await deleteExpiredMemories(userId);
      [user, memories, history] = await Promise.all([
        getUser(userId),
        getTopMemories(userId),
        getHistory(userId, sessionId),
      ]);
    } catch (databaseError) {
      console.error("Context database warning:", databaseError);
    }

    const raw = await generateTherapistResponse({
      user,
      memories,
      history,
      message,
      reportedMood,
    });
    const { therapistReply, memoryUpdate } = parseModelResponse(raw);
    const memoryRows = prepareMemoryRows(userId, memoryUpdate);

    const writes: Promise<unknown>[] = [
      saveMessage(userId, sessionId, "user", message),
      saveMessage(userId, sessionId, "assistant", therapistReply),
      saveMoodLog(userId, sessionId, message, mood),
      saveMemories(memoryRows),
      deleteMemoriesByIds(userId, memoryUpdate.forget_ids),
    ];

    if (memoryUpdate.user_name) {
      writes.push(updateUserName(userId, memoryUpdate.user_name));
    }

    const writeResults = await Promise.allSettled(writes);
    for (const result of writeResults) {
      if (result.status === "rejected") {
        console.error("Post-response storage warning:", result.reason);
      }
    }

    return json({
      output: therapistReply || "I’m here with you. Could you tell me a little more?",
      crisis_detected: false,
      mood: mood.mood,
    });
  } catch (error) {
    console.error("Serenity chat error:", error);

    if (error instanceof SyntaxError) {
      return json({ error: "Invalid JSON body" }, 400);
    }

    if (error instanceof Error && error.name === "AbortError") {
      return json({ error: "Serenity took too long to respond" }, 504);
    }

    return json({ error: "Serenity could not respond right now" }, 500);
  }
}
