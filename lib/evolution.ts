import { getEnv } from "@/lib/env";

type SendTextPayload = {
  number: string;
  text: string;
};

export async function sendWhatsAppText({ number, text }: SendTextPayload): Promise<void> {
  const env = getEnv();
  const baseUrl = env.EVOLUTION_API_URL.replace(/\/$/, "");
  const url = `${baseUrl}/message/sendText/${env.EVOLUTION_INSTANCE}`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: env.EVOLUTION_API_KEY,
    },
    body: JSON.stringify({
      number,
      text,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const textError = await response.text();
    throw new Error(`Evolution API failed (${response.status}): ${textError}`);
  }
}
