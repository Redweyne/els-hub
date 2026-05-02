"use client"

export const dynamic = "force-dynamic"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { createBrowserClient } from "@supabase/ssr"
import Link from "next/link"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, Lock, Sword } from "lucide-react"

export default function TrackingPage() {
  const router = useRouter()
  const [isOfficer, setIsOfficer] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const supabase = createBrowserClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
        )

        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setIsOfficer(false)
          setIsLoading(false)
          return
        }

        // Check if user is an officer
        const { data: profile } = await supabase
          .from("profiles")
          .select("platform_role")
          .eq("auth_user_id", user.id)
          .single()

        const userRole = profile?.platform_role
        setIsOfficer(userRole === "officer" || userRole === "owner")
      } catch (err) {
        console.error("Check access error:", err)
        setError("Failed to verify access")
      } finally {
        setIsLoading(false)
      }
    }

    checkAccess()
  }, [])

  if (isLoading) {
    return (
      <>
        <Header title="Tracking" />
        <main className="min-h-screen bg-ink pt-32 pb-bottom-nav flex items-center justify-center">
          <motion.div
            className="w-12 h-12 rounded-full border-2 border-ember border-t-transparent"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
        </main>
        <BottomNav />
      </>
    )
  }

  if (!isOfficer) {
    return (
      <>
        <Header title="Tracking" />
        <main className="min-h-screen bg-ink pt-32 pb-bottom-nav px-4">
          <div className="max-w-2xl mx-auto">
            <Card className="bg-smoke/60 border-ash">
              <CardContent className="p-8 text-center">
                <Lock size={32} className="mx-auto mb-4 text-blood" />
                <p className="text-bone text-sm font-semibold mb-2">Officer Access Only</p>
                <p className="text-bone/60 text-sm mb-6">
                  You need officer permissions to access event tracking.
                </p>
                <Link href="/">
                  <Button className="bg-ember hover:bg-ember/90">
                    Back to Home
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
        <BottomNav />
      </>
    )
  }

  return (
    <>
      <Header title="Tracking" />
      <main className="min-h-screen bg-ink pt-16 pb-bottom-nav">
        <div className="px-4 max-w-2xl mx-auto py-8 space-y-4">
          <p className="text-xs text-bone/50 uppercase tracking-widest px-2 mb-6">
            Event Tracking
          </p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Link href="/tracking/new">
              <Card className="bg-gradient-to-br from-ember/15 to-blood/10 border-ember/40 hover:border-ember/60 transition-all cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4 min-h-[80px]">
                  <div className="w-12 h-12 rounded-lg bg-ember/20 flex items-center justify-center flex-shrink-0">
                    <Upload size={22} className="text-ember" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-bone mb-1">Upload Event</p>
                    <p className="text-sm text-bone/60">
                      Drop FCU, Oak, or GW Daily screenshots — OCR handles the rest
                    </p>
                  </div>
                  <div className="text-ember text-xl flex-shrink-0">→</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
          >
            <Link href="/tracking/campaigns/new">
              <Card className="bg-gradient-to-br from-blood/15 to-blood-dark/10 border-blood/40 hover:border-blood/60 transition-all cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4 min-h-[80px]">
                  <div className="w-12 h-12 rounded-lg bg-blood/20 flex items-center justify-center flex-shrink-0">
                    <Sword size={22} className="text-blood-light" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-bone mb-1">Start GW Campaign</p>
                    <p className="text-sm text-bone/60">
                      Anchor a 50-day Governor&apos;s War with auto-rotating dailies
                    </p>
                  </div>
                  <div className="text-blood-light text-xl flex-shrink-0">→</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Link href="/tracking/review">
              <Card className="bg-gradient-to-br from-bone/10 to-ash/10 border-ash hover:border-bone/30 transition-all cursor-pointer">
                <CardContent className="p-6 flex items-center gap-4 min-h-[80px]">
                  <div className="w-12 h-12 rounded-lg bg-bone/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-lg font-bold text-bone">✓</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-bone mb-1">Review Queue</p>
                    <p className="text-sm text-bone/60">Resolve ambiguous member name matches</p>
                  </div>
                  <div className="text-bone/50 text-xl flex-shrink-0">→</div>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
