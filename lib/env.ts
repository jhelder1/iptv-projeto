import { z } from "zod";

const envSchema = z.object({
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  MP_ACCESS_TOKEN: z.string().min(1),
  EVOLUTION_API_URL: z.string().url(),
  EVOLUTION_API_KEY: z.string().min(1),
  EVOLUTION_INSTANCE: z.string().min(1),
  ADMIN_WHATSAPP: z.string().min(8),
  WEBHOOK_SECRET: z.string().min(8).optional(),
});

let parsedEnv: z.infer<typeof envSchema> | null = null;

export function getEnv(): z.infer<typeof envSchema> {
  if (parsedEnv) {
    return parsedEnv;
  }

  parsedEnv = envSchema.parse({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    MP_ACCESS_TOKEN: process.env.MP_ACCESS_TOKEN,
    EVOLUTION_API_URL: process.env.EVOLUTION_API_URL,
    EVOLUTION_API_KEY: process.env.EVOLUTION_API_KEY,
    EVOLUTION_INSTANCE: process.env.EVOLUTION_INSTANCE,
    ADMIN_WHATSAPP: process.env.ADMIN_WHATSAPP,
    WEBHOOK_SECRET: process.env.WEBHOOK_SECRET,
  });

  return parsedEnv;
}
