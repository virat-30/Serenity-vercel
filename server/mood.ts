export type MoodAnalysis = {
  mood: string;
  confidence: number;
  sentiment_score: number;
};

const moodMap: Record<string, string[]> = {
  anxious: ["anxious", "anxiety", "nervous", "worried", "panic", "scared", "fear", "stressed", "tense", "uneasy", "restless", "on edge", "overthinking", "racing thoughts", "spiraling"],
  sad: ["sad", "crying", "tears", "depressed", "unhappy", "miserable", "heartbroken", "grief", "loss", "sorrow", "down", "low", "empty", "numb", "broken", "devastated", "hurt"],
  angry: ["angry", "furious", "rage", "mad", "frustrated", "irritated", "annoyed", "livid", "outraged", "resentful", "bitter", "hostile", "hate", "infuriated", "fed up"],
  happy: ["happy", "joy", "excited", "grateful", "thankful", "great", "wonderful", "amazing", "fantastic", "blessed", "content", "glad", "delighted", "thrilled", "motivated", "optimistic"],
  hopeless: ["hopeless", "worthless", "pointless", "no hope", "giving up", "cant go on", "no future", "trapped", "stuck", "never get better", "useless", "failure", "burden", "no purpose", "meaningless"],
  lonely: ["lonely", "alone", "isolated", "nobody", "no one", "abandoned", "disconnected", "invisible", "misunderstood", "no friends", "no one cares", "left out", "ignored", "dont belong"],
  overwhelmed: ["overwhelmed", "too much", "cant cope", "falling apart", "breaking down", "cant handle", "drowning", "pressure", "exhausted", "burnout", "burnt out", "drained", "about to snap", "suffocating"],
  calm: ["calm", "peaceful", "relaxed", "better", "okay", "fine", "alright", "relieved", "settled", "grounded", "balanced", "at ease", "serene", "progress", "at peace"],
  confused: ["confused", "lost", "dont know", "unsure", "uncertain", "unclear", "mixed up", "no direction", "foggy", "brain fog", "cant think clearly", "scattered", "cant decide", "torn", "conflicted"],
  guilty: ["guilty", "guilt", "ashamed", "shame", "embarrassed", "regret", "remorse", "sorry", "my fault", "i messed up", "i failed", "should have", "my mistake", "i blame myself"],
  traumatized: ["trauma", "traumatic", "traumatized", "flashback", "nightmare", "ptsd", "triggered", "bad memories", "haunted", "reliving", "abuse", "abused", "violated", "unsafe", "hypervigilant"],
  grief: ["grief", "grieving", "bereavement", "lost someone", "someone died", "passed away", "death", "died", "funeral", "miss them", "mourning"],
};

const positiveWords = new Set(["good", "better", "happy", "great", "wonderful", "calm", "peaceful", "grateful", "hopeful", "relieved", "excited", "okay", "fine", "love", "joy", "blessed", "thankful", "progress", "improving", "stronger", "healing", "growing", "clarity"]);
const negativeWords = new Set(["sad", "anxious", "angry", "hopeless", "lonely", "overwhelmed", "terrible", "awful", "horrible", "worst", "hate", "fear", "scared", "depressed", "worthless", "failure", "alone", "lost", "broken", "empty", "numb", "pain", "hurt", "crying", "desperate", "trapped", "stuck", "drowning", "exhausted", "drained"]);

export function analyzeMood(input: string): MoodAnalysis {
  const message = input.toLowerCase();
  let detectedMood = "neutral";
  let confidence = 0.5;
  let matchCount = 0;

  for (const [mood, keywords] of Object.entries(moodMap)) {
    const hits = keywords.reduce(
      (count, keyword) => count + (message.includes(keyword) ? 1 : 0),
      0,
    );

    if (hits > matchCount) {
      matchCount = hits;
      detectedMood = mood;
      confidence = Math.min(0.5 + hits * 0.1, 0.99);
    }
  }

  let sentimentScore = 0;
  for (const word of message.match(/[a-z']+/g) || []) {
    if (positiveWords.has(word)) sentimentScore += 0.2;
    if (negativeWords.has(word)) sentimentScore -= 0.2;
  }

  sentimentScore = Math.max(-1, Math.min(1, sentimentScore));

  return {
    mood: detectedMood,
    confidence,
    sentiment_score: Math.round(sentimentScore * 100) / 100,
  };
}
