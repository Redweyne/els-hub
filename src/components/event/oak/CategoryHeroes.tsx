"use client"

import Link from "next/link"
import { motion, useReducedMotion } from "framer-motion"
import { ChevronRight, Crosshair, Flag, MapPin } from "lucide-react"
import { Eyebrow, Numeric } from "@/components/typography"
import { cn } from "@/lib/cn"

export interface CategoryHero {
  category: "total" | "kill" | "occupation"
  name: string
  value: number
  /** When we know which member row this corresponds to, link straight to their profile. */
  memberId?: string | null
}

export interface CategoryHeroesProps {
  heroes: CategoryHero[]
  className?: string
}

const META: Record<
  CategoryHero["category"],
  { label: string; icon: React.ComponentType<{ size?: number; className?: string }>; accent: string }
> = {
  total: { label: "Top Earner", icon: Flag, accent: "text-ember" },
  kill: { label: "Top Killer", icon: Crosshair, accent: "text-blood-light" },
  occupation: { label: "Top Holder", icon: MapPin, accent: "text-bone" },
}

/**
 * "Best of All" — three faction members who topped each category in this Oak match.
 * Mobile: stacked rows. Tablet+: 3-column grid.
 */
export function CategoryHeroes({ heroes, className }: CategoryHeroesProps) {
  if (heroes.length === 0) return null
  const reducedMotion = useReducedMotion()

  return (
    <div className={cn("space-y-2 md:space-y-0 md:grid md:grid-cols-3 md:gap-3", className)}>
      {heroes.map((hero, idx) => {
        const m = META[hero.category]
        const Icon = m.icon
        const wrapperClass = cn(
          "block surface-3 rounded-xl border border-ash px-3.5 py-3 md:py-3.5",
          "transition-all duration-200",
          hero.memberId
            ? "active:scale-[0.99] hover:border-ember/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink"
            : "",
        )
        const inner = (
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex-shrink-0 w-9 h-9 rounded-lg bg-ink/60 border border-ash flex items-center justify-center",
                m.accent,
              )}
            >
              <Icon size={16} aria-hidden="true" />
            </div>
            <div className="flex-1 min-w-0">
              <Eyebrow tone="muted" size="xs">
                {m.label}
              </Eyebrow>
              <p className="font-semibold text-bone text-sm truncate mt-0.5">
                {hero.name || "—"}
              </p>
              <Numeric
                value={hero.value}
                format="compact"
                precision={1}
                className={cn("text-base font-bold mt-0.5", m.accent)}
              />
            </div>
            {hero.memberId && (
              <ChevronRight
                size={14}
                className="text-bone/30 flex-shrink-0"
                aria-hidden="true"
              />
            )}
          </div>
        )
        return (
          <motion.div
            key={hero.category}
            initial={reducedMotion ? { opacity: 0 } : { opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: idx * 0.08,
              duration: 0.5,
              ease: [0.2, 0.8, 0.2, 1],
            }}
          >
            {hero.memberId ? (
              <Link href={`/members/${hero.memberId}`} className={wrapperClass}>
                {inner}
              </Link>
            ) : (
              <div className={wrapperClass}>{inner}</div>
            )}
          </motion.div>
        )
      })}
    </div>
  )
}
