"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter, usePathname } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import { ChevronLeft, Users, Mail, Compass } from "lucide-react"
import { cn } from "@/lib/cn"

const ADMIN_TABS = [
  { href: "/admin/roster", label: "Roster", icon: Users },
  { href: "/admin/requests", label: "Requests", icon: Mail },
  { href: "/tracking", label: "Tracking", icon: Compass },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isAuthed, setIsAuthed] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { session } } = await supabase.auth.getSession()

        if (!session) {
          router.push("/els/login")
          return
        }

        // Check if user is officer or owner
        const { data: profile, error } = await supabase
          .from("profiles")
          .select("platform_role")
          .eq("auth_user_id", session.user.id)
          .single()

        if (error || !profile || !["owner", "officer"].includes(profile.platform_role)) {
          router.push("/els")
          return
        }

        setIsAuthed(true)
      } catch (err) {
        console.error("Auth check failed:", err)
        router.push("/els/login")
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router])

  if (isLoading) {
    return (
      <main className="bg-ink min-h-screen flex items-center justify-center">
        <div className="text-bone text-sm">Loading...</div>
      </main>
    )
  }

  if (!isAuthed) {
    return null
  }

  return (
    <>
      <AdminSubNav pathname={pathname} />
      {children}
    </>
  )
}

function AdminSubNav({ pathname }: { pathname: string | null }) {
  return (
    <div
      className="fixed top-0 left-0 right-0 z-40 bg-ink/95 backdrop-blur-md border-b border-ash/50"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center gap-1 px-3 py-2 min-h-[56px]">
        <Link
          href="/"
          aria-label="Back to app"
          className={cn(
            "min-h-[40px] min-w-[40px] inline-flex items-center justify-center rounded-md",
            "text-bone/70 hover:text-bone hover:bg-smoke/50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember",
          )}
        >
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
        <span className="font-display text-sm font-bold text-bone tracking-[0.16em] uppercase mr-2">
          Admin
        </span>
        <div className="flex-1 flex gap-1 overflow-x-auto -mr-2 pr-2">
          {ADMIN_TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = pathname?.startsWith(tab.href) ?? false
            return (
              <Link
                key={tab.href}
                href={tab.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "flex-shrink-0 inline-flex items-center gap-1.5 px-3 min-h-[36px] rounded-full text-[11px] uppercase tracking-[0.14em] font-bold border transition-all active:scale-[0.97]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                  isActive
                    ? "bg-ember text-ink border-ember"
                    : "bg-ink/45 text-bone/65 border-ash hover:text-bone hover:border-ember/40",
                )}
              >
                <Icon size={12} aria-hidden="true" />
                <span>{tab.label}</span>
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}
