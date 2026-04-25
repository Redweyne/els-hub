"use client"

import { ReactNode } from "react"
import { Card, CardContent } from "@/components/ui/card"

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <Card className="bg-smoke/40 border-ash/30">
      <CardContent className="p-8 text-center space-y-4">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-full bg-ember/10 flex items-center justify-center text-ember">
            {icon}
          </div>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-bone mb-1">{title}</h3>
          <p className="text-sm text-bone/60">{description}</p>
        </div>
        {action && <div className="pt-2">{action}</div>}
      </CardContent>
    </Card>
  )
}
