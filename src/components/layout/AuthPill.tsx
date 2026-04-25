"use client"

import { useEffect, useState, useRef } from "react"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ChevronDown } from "lucide-react"
import { ariaLabels } from "@/lib/a11y"

export function AuthPill() {
  const [user, setUser] = useState<{ email?: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user ?? null)
      } catch (err) {
        console.error("Auth check failed:", err)
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [])

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  if (isLoading) {
    return (
      <div className="h-10 w-24 bg-smoke/50 rounded-full animate-pulse" />
    )
  }

  if (!user) {
    return (
      <div className="flex gap-2">
        <Link href="/els/login">
          <Button variant="ghost" size="sm" className="text-bone/70 hover:text-bone text-xs">
            Log in
          </Button>
        </Link>
        <Link href="/signup">
          <Button size="sm" className="bg-blood hover:bg-blood/90 text-xs px-4">
            Sign up
          </Button>
        </Link>
      </div>
    )
  }

  const initials = user.email?.[0].toUpperCase() ?? "?"

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={ariaLabels.openMenu}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex items-center gap-2 px-3 py-2 rounded-full border border-ash hover:border-ember transition-colors focus-visible:ring-1 focus-visible:ring-ember"
      >
        <Avatar className="h-6 w-6">
          <AvatarFallback className="bg-ember text-ink text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        <ChevronDown size={14} className="text-bone/50" aria-hidden="true" />
      </button>

      {isOpen && (
        <nav
          role="menu"
          className="absolute right-0 top-full mt-2 bg-smoke border border-ash rounded-lg shadow-lg overflow-hidden min-w-40 z-50"
        >
          <div className="px-4 py-2 border-b border-ash/50">
            <p className="text-xs text-bone/70">{user.email}</p>
          </div>
          <Link href="/els/admin/roster" className="block">
            <button
              role="menuitem"
              className="w-full text-left px-4 py-2 text-sm text-bone hover:bg-ash transition-colors focus-visible:outline-none focus-visible:bg-ash"
            >
              Admin Panel
            </button>
          </Link>
          <button
            role="menuitem"
            onClick={async () => {
              const supabase = createBrowserClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
              )
              await supabase.auth.signOut()
              window.location.href = "/els"
            }}
            className="w-full text-left px-4 py-2 text-sm text-blood hover:bg-ash transition-colors border-t border-ash/50 focus-visible:outline-none focus-visible:bg-ash"
          >
            {ariaLabels.logout}
          </button>
        </nav>
      )}
    </div>
  )
}
