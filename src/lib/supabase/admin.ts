import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client with the service-role key.
 * BYPASSES Row-Level Security. Never import from client code.
 *
 * Used for:
 *  - OCR worker writes (event_screenshots, event_scores, review_queue)
 *  - Administrative approvals (account_requests → auth.users + profiles)
 *  - Seed migrations
 */
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
