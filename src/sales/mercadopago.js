const MP_API = "https://api.mercadopago.com";

function token() {
  return process.env.ROBLOX_MP_ACCESS_TOKEN;
}

async function createPreference(plan, priceUsd, externalRef, payerEmail) {
  const body = {
    items: [
      {
        title: `Ceitus Roblox — ${plan}`,
        quantity: 1,
        unit_price: priceUsd,
        currency_id: "USD"
      }
    ],
    external_reference: externalRef,
    payer: payerEmail ? { email: payerEmail } : undefined,
    auto_return: "approved",
    back_urls: {
      success: "https://discord.com",
      failure: "https://discord.com",
      pending: "https://discord.com"
    }
  };

  const res = await fetch(`${MP_API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`MP preferences error ${res.status}: ${err}`);
  }

  return res.json(); // .init_point, .id
}

async function searchPaymentByRef(externalRef) {
  const res = await fetch(
    `${MP_API}/v1/payments/search?external_reference=${encodeURIComponent(externalRef)}&sort=date_created&criteria=desc&range=date_created&begin_date=NOW-30DAYS&end_date=NOW`,
    {
      headers: { Authorization: `Bearer ${token()}` }
    }
  );

  if (!res.ok) return null;
  const data = await res.json();
  const results = data?.results ?? [];
  return results.find((p) => p.status === "approved") ?? null;
}

module.exports = { createPreference, searchPaymentByRef };
