import { BottomNav } from "@/components/layout/BottomNav"
import { AuthPill } from "@/components/layout/AuthPill"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Top header bar */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-ink/95 border-b border-ash backdrop-blur-sm">
        <div className="flex items-center justify-between px-6 py-4 max-w-6xl mx-auto w-full">
          <h1 className="font-display text-xl font-bold text-bone tracking-[0.2em]">
            ELS
          </h1>
          <AuthPill />
        </div>
      </header>

      {/* Main content */}
      {children}

      {/* Bottom navigation */}
      <BottomNav />
    </>
  )
}
