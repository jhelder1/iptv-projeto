import { getEnv } from "@/lib/env";

export type MercadoPagoPayment = {
  id: number;
  status: string;
  external_reference: string | null;
};

export async function fetchMercadoPagoPayment(paymentId: string): Promise<MercadoPagoPayment> {
  const env = getEnv();
  const response = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Mercado Pago request failed (${response.status}): ${text}`);
  }

  return (await response.json()) as MercadoPagoPayment;
}
