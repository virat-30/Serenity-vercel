import { json, isSafeId } from "../server/http";
import { getHistory } from "../server/supabase";

async function handler(request: Request) {
  if (request.method !== "GET") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const url = new URL(request.url);
    const userId = url.searchParams.get("userId");
    const sessionId = url.searchParams.get("sessionId");

    if (!isSafeId(userId) || !isSafeId(sessionId)) {
      return json({ error: "A valid userId and sessionId are required" }, 400);
    }

    const messages = await getHistory(userId, sessionId);
    return json({ messages, source: "supabase" });
  } catch (error) {
    console.error("Serenity history error:", error);
    return json({ error: "Stored history is temporarily unavailable" }, 500);
  }
}
export default {
  fetch: handler,
};
