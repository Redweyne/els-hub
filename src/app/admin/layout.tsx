"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
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

  return <>{children}</>
}
