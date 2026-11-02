/**
 * Cloudflare Pages Function: /api/sync
 * Provides multi-device sync for ChronoShift history via Cloudflare KV.
 * 
 * Binding expected in Cloudflare Pages:
 * Variable name: CHRONO_KV
 */

export async function onRequest(context) {
  const { request, env } = context;
  const kv = env.CHRONO_KV;

  // Set standard CORS headers so client requests work smoothly
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json'
  };

  // Handle preflight OPTIONS request
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Verify KV binding exists
  if (!kv) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'CHRONO_KV binding not found. Please bind a KV namespace named CHRONO_KV in Cloudflare Pages Settings -> Functions.'
      }),
      { status: 500, headers: corsHeaders }
    );
  }

  try {
    const url = new URL(request.url);

    // ==========================================
    // GET: Pull history for a sync key
    // ==========================================
    if (request.method === 'GET') {
      const syncKey = url.searchParams.get('key');
      if (!syncKey || syncKey.trim().length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid or missing sync key (minimum 6 characters).' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const storageKey = `chrono_history_${syncKey.trim().toLowerCase()}`;
      const rawData = await kv.get(storageKey, 'json');

      if (!rawData) {
        return new Response(
          JSON.stringify({ success: true, history: [], notFound: true }),
          { status: 200, headers: corsHeaders }
        );
      }

      return new Response(
        JSON.stringify({
          success: true,
          history: rawData.history || [],
          updatedAt: rawData.updatedAt || null
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    // ==========================================
    // POST: Push history for a sync key
    // ==========================================
    if (request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!body || !body.key || body.key.trim().length < 6) {
        return new Response(
          JSON.stringify({ success: false, error: 'Invalid payload or missing sync key.' }),
          { status: 400, headers: corsHeaders }
        );
      }

      const syncKey = body.key.trim().toLowerCase();
      const history = Array.isArray(body.history) ? body.history : [];
      const storageKey = `chrono_history_${syncKey}`;

      const payload = {
        updatedAt: new Date().toISOString(),
        history: history.slice(0, 300) // Keep latest 300 entries max
      };

      // Store with 365 days rolling expiration (refreshed on every write)
      await kv.put(storageKey, JSON.stringify(payload), {
        expirationTtl: 60 * 60 * 24 * 365
      });

      return new Response(
        JSON.stringify({
          success: true,
          count: payload.history.length,
          updatedAt: payload.updatedAt
        }),
        { status: 200, headers: corsHeaders }
      );
    }

    return new Response(
      JSON.stringify({ success: false, error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message || 'Server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
}
