"use client"

import { useRouter, usePathname } from "next/navigation"
import { ChevronLeft } from "lucide-react"
import { AuthPill } from "./AuthPill"
import { GWLiveBadge } from "./GWLiveBadge"
import { Button } from "@/components/ui/button"

interface HeaderProps {
  title?: string
  showBack?: boolean
  onBackClick?: () => void
}

export function Header({ title, showBack = true, onBackClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const shouldShowBack = showBack && !pathname?.startsWith("/login") && !pathname?.startsWith("/signup")

  const handleBack = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.back()
    }
  }

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 bg-ink/98 border-b border-ash backdrop-blur-sm"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 min-h-[64px]">
        <div className="flex items-center gap-2 min-w-0 flex-1">
          {shouldShowBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              className="text-bone hover:text-ember transition-colors -ml-2 flex-shrink-0"
              aria-label="Go back"
            >
              <ChevronLeft size={24} />
            </Button>
          )}
          <h1 className="font-display text-lg font-bold text-bone tracking-[0.15em] truncate">
            {title || "ELS"}
          </h1>
        </div>
        {/* Mobile-first: badge sits between title and AuthPill, hides if no campaign */}
        <GWLiveBadge />
        <AuthPill />
      </div>
    </header>
  )
}
