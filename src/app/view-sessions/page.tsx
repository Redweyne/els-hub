import { redirect } from "next/navigation"
import { BottomNav } from "@/components/layout/BottomNav"
import { SessionViewer } from "@/components/analytics/SessionViewer"
import { readAnalyticsReport } from "@/lib/analytics/storage"
import { createClient } from "@/lib/supabase/server"
import { appPath } from "@/lib/paths"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export default async function ViewSessionsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect(appPath("/login"))

  const { data: profile } = await supabase
    .from("profiles")
    .select("platform_role")
    .eq("auth_user_id", user.id)
    .maybeSingle()

  if (!profile || !["owner", "officer"].includes(profile.platform_role)) {
    redirect(appPath("/"))
  }

  const report = await readAnalyticsReport(7)

  return (
    <>
      <SessionViewer initialReport={report} />
      <BottomNav />
    </>
  )
}
