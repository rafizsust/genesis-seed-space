import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type TtsItem = {
  key: string;
  text: string;
};

async function decryptApiKey(encryptedValue: string, encryptionKey: string): Promise<string> {
  const encoder = new TextEncoder();
  const decoder = new TextDecoder();

  const combined = Uint8Array.from(atob(encryptedValue), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const encryptedData = combined.slice(12);

  const keyData = encoder.encode(encryptionKey);
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData.slice(0, 32),
    { name: "AES-GCM" },
    false,
    ["decrypt"]
  );

  const decryptedData = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, cryptoKey, encryptedData);
  return decoder.decode(decryptedData);
}

async function generateTtsPcmBase64({
  apiKey,
  text,
  voiceName,
}: {
  apiKey: string;
  text: string;
  voiceName: string;
}): Promise<string> {
  const prompt = `You are an IELTS Speaking examiner with a neutral British accent.\n\nRead aloud EXACTLY the following text. Do not add, remove, or paraphrase anything. Use natural pacing and clear pronunciation.\n\n"""\n${text}\n"""`;

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName },
            },
          },
        },
      }),
    }
  );

  if (resp.ok) {
    const data = await resp.json();
    const audioData = data?.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data as string | undefined;
    if (!audioData) throw new Error("No audio returned from Gemini TTS");
    return audioData;
  }

  // Handle quota / rate limit quickly (no long retries in edge functions)
  if (resp.status === 429) {
    let retryAfterSeconds: number | undefined;

    try {
      const data = await resp.json();
      const retryInfo = (data?.error?.details || []).find((d: any) => d?.["@type"]?.includes("RetryInfo"));
      const retryDelay = retryInfo?.retryDelay as string | undefined; // e.g. "36s"
      const m = retryDelay?.match(/(\d+)/);
      if (m) retryAfterSeconds = parseInt(m[1], 10);

      console.error("Gemini TTS error:", 429, JSON.stringify(data, null, 2));

      const e = new Error(
        `Gemini TTS quota/rate limit reached. Try again in ${retryAfterSeconds ?? 30}s, or enable billing/increase quota for your Gemini API key.`
      );
      (e as any).status = 429;
      (e as any).retryAfterSeconds = retryAfterSeconds;
      throw e;
    } catch (parseErr) {
      const e = new Error("Gemini TTS quota/rate limit reached (429). Please try again later or enable billing.");
      (e as any).status = 429;
      throw e;
    }
  }

  const t = await resp.text();
  console.error("Gemini TTS error:", resp.status, t);
  throw new Error(`Gemini TTS failed (${resp.status})`);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Support single item generation (new) or batch (legacy)
    const body = await req.json();
    const { item, voiceName }: { item?: TtsItem; voiceName?: string } = body;

    // Single item mode - generate ONE clip quickly
    if (item) {
      if (!item.key || !item.text) {
        return new Response(JSON.stringify({ error: "item.key and item.text are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: secretData, error: secretError } = await supabaseClient
        .from("user_secrets")
        .select("encrypted_value")
        .eq("user_id", user.id)
        .eq("secret_name", "GEMINI_API_KEY")
        .single();

      if (secretError || !secretData) {
        return new Response(
          JSON.stringify({ error: "Gemini API key not found. Please add your API key in Settings." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const appEncryptionKey = Deno.env.get("app_encryption_key");
      if (!appEncryptionKey) throw new Error("app_encryption_key not configured");

      const geminiApiKey = await decryptApiKey(secretData.encrypted_value, appEncryptionKey);
      const resolvedVoice = (voiceName || "Kore").trim();

      console.log("generate-gemini-tts: single clip:", item.key, "voice=", resolvedVoice);

      const audioBase64 = await generateTtsPcmBase64({
        apiKey: geminiApiKey,
        text: item.text,
        voiceName: resolvedVoice,
      });

      return new Response(
        JSON.stringify({
          success: true,
          clip: { key: item.key, text: item.text, audioBase64, sampleRate: 24000 },
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Legacy batch mode - kept for compatibility but should not be used
    return new Response(
      JSON.stringify({ error: "Batch mode deprecated. Use single item mode instead." }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    console.error("generate-gemini-tts error:", error);

    const status = (error as any)?.status;
    const retryAfterSeconds = (error as any)?.retryAfterSeconds;
    const message = error instanceof Error ? error.message : "Unknown error";

    if (status === 429) {
      return new Response(JSON.stringify({ error: message, retryAfterSeconds }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
