/**
 * Monitor externo de Lanza (Cloudflare Worker con cron cada 5 minutos).
 * Corre FUERA de tu PC, asi que avisa tambien si la PC se apaga o se cae el tunel.
 *
 *  1) Salud: pide /integrations a la API publica; si no responde 200 -> aviso por Telegram.
 *  2) Publicaciones: busca posts en estado ERROR en la ventana reciente -> aviso por Telegram.
 *
 * Secrets (wrangler secret put ...): LANZA_API_KEY, TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID
 * Variable: LANZA_URL (en wrangler.toml)
 * KV opcional (binding ESTADO): evita avisos repetidos y manda "Lanza se recupero".
 */
interface Env {
  LANZA_URL: string;
  LANZA_API_KEY: string;
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
  ESTADO?: KVNamespace;
}

const VENTANA_MIN = 6; // un poco mayor que el cron de 5 min

async function avisar(env: Env, texto: string): Promise<void> {
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: texto.slice(0, 4096) }),
  });
}

async function api(env: Env, ruta: string): Promise<Response> {
  return fetch(`${env.LANZA_URL.replace(/\/+$/, "")}/api/public/v1${ruta}`, {
    headers: { authorization: env.LANZA_API_KEY },
    signal: AbortSignal.timeout(15_000),
  });
}

async function revisar(env: Env): Promise<void> {
  // 1) Salud
  let sano = false;
  let detalle = "";
  try {
    const r = await api(env, "/integrations");
    sano = r.ok;
    if (!r.ok) detalle = `respondio ${r.status}`;
  } catch (e) {
    detalle = e instanceof Error ? e.message : String(e);
  }

  const estabaCaida = (await env.ESTADO?.get("caida")) === "1";
  if (!sano) {
    // Con KV avisa una vez; sin KV avisa cada vez (cada 5 min).
    if (!estabaCaida) {
      await avisar(env, `🔴 Lanza no responde (${detalle}). Revisa la PC, Docker y el tunel.\n${env.LANZA_URL}`);
      await env.ESTADO?.put("caida", "1");
    } else if (!env.ESTADO) {
      await avisar(env, `🔴 Lanza sigue sin responder (${detalle}).`);
    }
    return;
  }
  if (estabaCaida) {
    await avisar(env, "🟢 Lanza se recupero y vuelve a responder.");
    await env.ESTADO?.delete("caida");
  }

  // 2) Publicaciones fallidas
  const ahora = new Date();
  const desde = new Date(ahora.getTime() - VENTANA_MIN * 60_000);
  const q = new URLSearchParams({ startDate: desde.toISOString(), endDate: ahora.toISOString() });
  const r = await api(env, `/posts?${q.toString()}`);
  if (!r.ok) return;
  const { posts } = (await r.json()) as {
    posts: { id: string; state?: string; publishDate?: string; integration?: { providerIdentifier?: string } }[];
  };
  const fallidos = (posts ?? []).filter((p) => p.state === "ERROR");
  for (const p of fallidos) {
    if (env.ESTADO && (await env.ESTADO.get(`err:${p.id}`))) continue;
    await avisar(
      env,
      `⚠️ Lanza: fallo una publicacion en ${p.integration?.providerIdentifier ?? "una red"} (${p.publishDate ?? "?"}).\nRevisa ${env.LANZA_URL}`,
    );
    await env.ESTADO?.put(`err:${p.id}`, "1", { expirationTtl: 86_400 });
  }
}

export default {
  async scheduled(_evento: ScheduledController, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil(revisar(env));
  },
};
