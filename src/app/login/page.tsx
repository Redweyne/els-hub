"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { createBrowserClient } from "@supabase/ssr"
import { motion, useReducedMotion } from "framer-motion"
import { ArrowRight, AlertCircle } from "lucide-react"

import { ELSEmblemV2 } from "@/components/heraldry"
import { Eyebrow, DisplayHeading } from "@/components/typography"
import { FormField } from "@/components/ui/form-field"
import { ParticleField } from "@/components/motion/ParticleField"
import { cn } from "@/lib/cn"

export default function LoginPage() {
  const router = useRouter()
  const reducedMotion = useReducedMotion()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [shakeKey, setShakeKey] = useState(0)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      )

      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError(authError.message)
        setShakeKey((k) => k + 1)
        setIsLoading(false)
        return
      }

      router.push("/")
      router.refresh()
    } catch {
      setError("Something blocked the gate. Try again.")
      setShakeKey((k) => k + 1)
      setIsLoading(false)
    }
  }

  return (
    <main
      id="main"
      className="relative min-h-[100svh] surface-1 film-grain-drift overflow-hidden flex items-center justify-center px-5 py-10"
    >
      <div
        className="aurora-orb-ember pointer-events-none"
        style={{ top: "-15%", left: "-12%", opacity: 0.85 }}
        aria-hidden="true"
      />
      <div
        className="aurora-orb-blood pointer-events-none"
        style={{ bottom: "-25%", right: "-18%", opacity: 0.75 }}
        aria-hidden="true"
      />

      {!reducedMotion && (
        <ParticleField
          count={20}
          direction="up"
          speed={12}
          size={1.2}
          maxOpacity={0.35}
        />
      )}

      <motion.div
        key={shakeKey}
        initial={{ opacity: 0, y: 18 }}
        animate={
          error
            ? {
                opacity: 1,
                y: 0,
                x: reducedMotion ? 0 : [-6, 6, -4, 4, -2, 0],
              }
            : { opacity: 1, y: 0 }
        }
        transition={{
          duration: error ? 0.4 : 0.7,
          ease: [0.2, 0.8, 0.2, 1],
        }}
        className="relative z-10 w-full max-w-sm"
      >
        <div
          className={cn(
            "relative rounded-2xl overflow-hidden",
            "bg-smoke/40 backdrop-blur-2xl",
            "border border-ash",
            "shadow-[0_30px_80px_-20px_rgba(0,0,0,0.7)]",
          )}
        >
          <div
            className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-ember/70 to-transparent"
            aria-hidden="true"
          />

          <div className="px-6 pt-7 pb-7">
            <motion.div
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex justify-center mb-5"
            >
              <ELSEmblemV2
                size={68}
                glow
                starCount={5}
                idScope="login"
              />
            </motion.div>

            <div className="text-center">
              <Eyebrow tone="ember" size="sm">
                Authenticate
              </Eyebrow>
              <DisplayHeading
                level={2}
                as="h1"
                className="mt-1.5 text-xl md:text-2xl"
              >
                Enter the Arena
              </DisplayHeading>
              <p className="mt-2 text-bone/55 text-[12px] font-body">
                Officers and members only.
              </p>
            </div>

            <form onSubmit={handleLogin} className="mt-6 space-y-4">
              <FormField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@els.com"
                disabled={isLoading}
                autoComplete="email"
                inputMode="email"
                required
              />

              <FormField
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="current-password"
                required
              />

              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start gap-2 bg-blood/10 border border-blood/40 rounded-lg p-3"
                  role="alert"
                >
                  <AlertCircle
                    size={14}
                    className="text-blood flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <p className="text-xs text-blood font-body leading-relaxed">
                    {error}
                  </p>
                </motion.div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={cn(
                  "relative w-full mt-2 py-3 rounded-full font-semibold text-bone overflow-hidden",
                  "bg-gradient-to-r from-blood-dark via-blood to-blood-light",
                  "shadow-[0_8px_24px_-8px_color-mix(in_oklab,var(--blood)_60%,transparent)]",
                  "transition-all duration-200 active:scale-[0.98]",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ember focus-visible:ring-offset-2 focus-visible:ring-offset-ink",
                  "disabled:opacity-70 disabled:cursor-not-allowed",
                  "text-sm tracking-[0.2em] uppercase",
                )}
              >
                {isLoading ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <motion.span
                      className="inline-block w-4 h-4 rounded-full border-2 border-bone/40 border-t-bone"
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 0.9,
                        repeat: Infinity,
                        ease: "linear",
                      }}
                      aria-hidden="true"
                    />
                    <span>Signing in</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center justify-center gap-2">
                    <span>Sign In</span>
                    <ArrowRight size={14} aria-hidden="true" />
                  </span>
                )}
              </button>
            </form>

            <div className="mt-6 pt-5 border-t border-ash/60 text-center space-y-2">
              <p className="text-[12px] text-bone/55 font-body">
                Don&apos;t have an account?
              </p>
              <Link
                href="/signup"
                className="inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-ember hover:text-ember/80 transition-colors font-body font-semibold"
              >
                Request Access
                <ArrowRight size={12} aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>

        <p className="mt-5 text-center text-[10px] uppercase tracking-[0.3em] text-bone/30 font-body">
          ELYSIUM · Class S · Server 78
        </p>
      </motion.div>
    </main>
  )
}
