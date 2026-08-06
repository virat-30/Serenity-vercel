export type SerenityConfig = {
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
  groqApiKey: string;
  groqModel: string;
};

function required(name: string) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export function getConfig(): SerenityConfig {
  const supabaseUrl = required("SUPABASE_URL").replace(/\/$/, "");

  if (!supabaseUrl.startsWith("https://")) {
    throw new Error("SUPABASE_URL must use https://");
  }

  return {
    supabaseUrl,
    supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),
    groqApiKey: required("GROQ_API_KEY"),
    groqModel: String(process.env.GROQ_MODEL || "llama-3.3-70b-versatile").trim(),
  };
}
