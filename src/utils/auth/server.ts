import { createClient } from "@supabase/supabase-js";

function createSupabaseAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const authKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !authKey) {
    throw new Error("Supabase auth environment variables are not configured.");
  }

  return createClient(supabaseUrl, authKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export function readBearerToken(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() || null;
}

export async function requireAuthenticatedUser(req: Request) {
  const token = readBearerToken(req);

  if (!token) {
    return { user: null, error: "Missing Authorization bearer token" };
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    return { user: null, error: error?.message || "Invalid auth token" };
  }

  return { user: data.user, error: null };
}
