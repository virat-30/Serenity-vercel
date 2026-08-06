import type { NewMemoryRow } from "./supabase";

type ParsedMemory = {
  type?: string;
  content?: string;
  importance?: number;
};

export type MemoryUpdate = {
  new_memories: ParsedMemory[];
  forget_ids: string[];
  user_name: string | null;
};

export function parseModelResponse(raw: string) {
  const marker = "<MEMORY_UPDATE>";
  const closing = "</MEMORY_UPDATE>";
  const markerIndex = raw.indexOf(marker);

  if (markerIndex === -1) {
    return {
      therapistReply: raw.trim(),
      memoryUpdate: {
        new_memories: [],
        forget_ids: [],
        user_name: null,
      } as MemoryUpdate,
    };
  }

  const therapistReply = raw.slice(0, markerIndex).trim();
  const payload = raw
    .slice(markerIndex + marker.length)
    .replace(closing, "")
    .trim();

  try {
    const parsed = JSON.parse(payload);
    return {
      therapistReply,
      memoryUpdate: {
        new_memories: Array.isArray(parsed?.new_memories)
          ? parsed.new_memories
          : [],
        forget_ids: Array.isArray(parsed?.forget_ids)
          ? parsed.forget_ids.filter((id: unknown) => typeof id === "string")
          : [],
        user_name:
          typeof parsed?.user_name === "string" && parsed.user_name.trim()
            ? parsed.user_name.trim().slice(0, 80)
            : null,
      } as MemoryUpdate,
    };
  } catch {
    return {
      therapistReply,
      memoryUpdate: {
        new_memories: [],
        forget_ids: [],
        user_name: null,
      } as MemoryUpdate,
    };
  }
}

export function prepareMemoryRows(
  userId: string,
  update: MemoryUpdate,
): NewMemoryRow[] {
  const allowedTypes = new Set(["emotion", "preference", "experience", "critical"]);
  const now = Date.now();

  return update.new_memories
    .filter(
      (memory) =>
        memory &&
        typeof memory.content === "string" &&
        memory.content.trim().length > 0,
    )
    .slice(0, 4)
    .map((memory) => {
      const type = allowedTypes.has(String(memory.type))
        ? String(memory.type)
        : "experience";
      const importance = Math.max(
        1,
        Math.min(10, Math.round(Number(memory.importance) || 5)),
      );
      const expiresAt =
        type === "emotion"
          ? new Date(now + 7 * 24 * 60 * 60 * 1000).toISOString()
          : importance < 4
            ? new Date(now + 30 * 24 * 60 * 60 * 1000).toISOString()
            : null;

      return {
        user_id: userId,
        memory_type: type,
        content: memory.content!.trim().slice(0, 1000),
        importance,
        expires_at: expiresAt,
      };
    });
}
