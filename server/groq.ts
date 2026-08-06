import { getConfig } from "./env";
import type { TherapyMemory, TherapyMessage, TherapyUser } from "./supabase";

type GroqContext = {
  user: TherapyUser | null;
  memories: TherapyMemory[];
  history: TherapyMessage[];
  message: string;
  reportedMood: string;
};

export async function generateTherapistResponse(context: GroqContext) {
  const config = getConfig();
  const userName = context.user?.name || "the user";
  const preferences = context.user?.preferences || {};
  const memoryContext = context.memories.length
    ? context.memories
        .map(
          (memory) =>
            `[${memory.memory_type.toUpperCase()} | id:${memory.id}] ${memory.content}`,
        )
        .join("\n")
    : "No saved memories yet.";

  const systemPrompt = `You are Serenity, a compassionate AI emotional-support companion with persistent memory. You are not a doctor or licensed therapist and must not diagnose conditions, prescribe treatment, or claim to replace professional care.

USER PROFILE
Name: ${userName}
Preferences: ${JSON.stringify(preferences)}
Reported check-in mood: ${context.reportedMood || "not specified"}

RELEVANT MEMORIES
${memoryContext}

INSTRUCTIONS
1. Be warm, calm, concise, empathetic and non-judgmental.
2. Use saved memories only when they are genuinely relevant. Never invent a memory.
3. Ask at most ONE focused reflective question in a response.
4. Do not provide a medical diagnosis or medication advice.
5. If the user reveals immediate danger or self-harm intent that the safety filter may have missed, prioritize immediate human help and emergency support.
6. After the user-facing reply, append exactly one machine-readable block in this form:
<MEMORY_UPDATE>{"new_memories":[{"type":"emotion|preference|experience|critical","content":"short factual memory","importance":1}],"forget_ids":[],"user_name":null}</MEMORY_UPDATE>
7. Only save useful future context. Do not save greetings, casual filler, diagnoses, or assumptions. Use importance 1-10. Temporary emotions should usually have lower importance.`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...context.history
      .filter((item) => item.role === "user" || item.role === "assistant")
      .slice(-20)
      .map((item) => ({ role: item.role, content: item.content })),
    { role: "user", content: context.message },
  ];

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);

  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.groqApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.groqModel,
        messages,
        max_tokens: 800,
        temperature: 0.7,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const details = (await response.text()).slice(0, 600);
      throw new Error(`Groq request failed (${response.status}): ${details}`);
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content;

    if (typeof content !== "string" || !content.trim()) {
      throw new Error("Groq returned an empty response");
    }

    return content.trim();
  } finally {
    clearTimeout(timeout);
  }
}
