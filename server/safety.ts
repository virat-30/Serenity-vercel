export type CrisisSeverity = "low" | "medium" | "high";

export type CrisisResult = {
  detected: boolean;
  severity: CrisisSeverity | null;
};

const highSeverity = [
  "suicide",
  "kill myself",
  "end my life",
  "want to die",
  "take my life",
  "no reason to live",
  "better off dead",
  "end it all",
  "overdose",
  "end everything",
];

const mediumSeverity = [
  "self harm",
  "self-harm",
  "hurt myself",
  "cutting myself",
  "hate myself",
  "worthless",
  "hopeless",
  "give up",
];

const lowSeverity = [
  "really sad",
  "very depressed",
  "completely lost",
  "breaking down",
  "falling apart",
  "cant cope",
  "can't cope",
];

export function detectCrisis(text: string): CrisisResult {
  const message = text.toLowerCase();

  if (highSeverity.some((keyword) => message.includes(keyword))) {
    return { detected: true, severity: "high" };
  }

  if (mediumSeverity.some((keyword) => message.includes(keyword))) {
    return { detected: true, severity: "medium" };
  }

  if (lowSeverity.some((keyword) => message.includes(keyword))) {
    return { detected: true, severity: "low" };
  }

  return { detected: false, severity: null };
}

export function crisisResponse(severity: CrisisSeverity) {
  if (severity === "high") {
    return (
      "I’m really glad you told me. I’m concerned about your immediate safety, and you do not have to handle this alone.\n\n" +
      "In India, you can contact Tele-MANAS at 14416 for 24/7 mental-health support. If you think you may act on these thoughts or you are in immediate danger, contact your local emergency services or go to the nearest emergency department. If possible, stay with someone you trust and move away from anything you could use to hurt yourself.\n\n" +
      "Are you in immediate danger right now?"
    );
  }

  if (severity === "medium") {
    return (
      "I’m really sorry you’re carrying this right now, and I’m glad you reached out. Your safety matters.\n\n" +
      "If you feel you might hurt yourself, please contact Tele-MANAS at 14416 in India or reach out to a trusted person who can stay with you. If you are in immediate danger, contact local emergency services or go to the nearest emergency department.\n\n" +
      "Can you tell me whether you feel safe right now?"
    );
  }

  return (
    "It sounds like things are feeling very heavy right now. We can slow this down and take it one step at a time. " +
    "If your distress starts feeling unsafe, Tele-MANAS is available in India at 14416.\n\n" +
    "What feels hardest to cope with at this moment?"
  );
}
