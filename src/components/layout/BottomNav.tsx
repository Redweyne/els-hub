"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  Home,
  Compass,
  Users,
  Calendar,
  Trophy,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/cn"

interface Tab {
  name: string
  href: string
  icon: LucideIcon
}

const tabs: Tab[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Tracking", href: "/tracking", icon: Compass },
  { name: "Members", href: "/members", icon: Users },
  { name: "Events", href: "/events", icon: Calendar },
  { name: "Honors", href: "/honor", icon: Trophy },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className="app-bottom-nav"
      aria-label="Primary"
    >
      <div className="pointer-events-none absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-ember/60 to-transparent" />
      <div className="relative z-10 flex h-[var(--bottom-nav-core)] items-stretch justify-around px-1">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive =
            tab.href === "/"
              ? pathname === "/"
              : pathname === tab.href ||
                pathname?.startsWith(tab.href + "/") ||
                false

          return (
            <Link
              key={tab.name}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "relative flex flex-col items-center justify-center gap-0.5",
                "flex-1 min-h-[56px] px-1 pt-2 pb-1",
                "transition-colors duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-inset",
                isActive
                  ? "text-ember"
                  : "text-bone/55 hover:text-bone/90 active:text-ember",
              )}
            >
              {isActive && (
                <motion.span
                  layoutId="bottom-nav-indicator"
                  className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-[2px] rounded-full bg-ember shadow-[0_0_8px_color-mix(in_oklab,var(--ember)_60%,transparent)]"
                  transition={{
                    type: "spring",
                    stiffness: 380,
                    damping: 32,
                  }}
                />
              )}
              <motion.span
                className={cn(
                  "inline-flex items-center justify-center rounded-full",
                  isActive
                    ? "bg-ember/12 p-2"
                    : "p-2",
                )}
                animate={{ scale: isActive ? 1 : 0.92 }}
                transition={{ type: "spring", stiffness: 400, damping: 28 }}
              >
                <Icon size={20} aria-hidden="true" />
              </motion.span>
              <span
                className={cn(
                  "text-[9px] uppercase tracking-[0.12em] font-body font-semibold",
                  isActive ? "opacity-100" : "opacity-80",
                )}
              >
                {tab.name}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
