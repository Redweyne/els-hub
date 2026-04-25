"use client"

import Link from "next/link"
import { motion } from "framer-motion"
import { Header } from "@/components/layout/Header"
import { BottomNav } from "@/components/layout/BottomNav"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageSquare } from "lucide-react"

export default function SocialPage() {
  return (
    <>
      <Header title="Social" />
      <main className="min-h-screen bg-ink pt-16 pb-bottom-nav">
        <div className="px-4 max-w-2xl mx-auto py-16 flex flex-col items-center justify-center text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="w-16 h-16 rounded-2xl bg-ember/10 flex items-center justify-center mx-auto mb-6">
              <MessageSquare size={32} className="text-ember" />
            </div>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="font-display text-3xl font-bold text-bone mb-3"
          >
            Coming Soon
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-bone/60 text-sm mb-8 max-w-xs"
          >
            The social feed and community features are coming in Phase 2. Stay tuned!
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
          >
            <Link href="/">
              <Button className="bg-ember hover:bg-ember/90">
                Back to Home
              </Button>
            </Link>
          </motion.div>
        </div>
      </main>
      <BottomNav />
    </>
  )
}
