"use client"

import { useEffect, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, X } from "lucide-react"
import { apiPath } from "@/lib/paths"

interface AccountRequest {
  id: string
  claimed_member_id: string
  username_requested: string
  extracted_player_id: string
  extracted_name: string
  extracted_vip_level: string
  status: string
  submitted_at: string
  ip_address: string
  recovery_email: string | null
  member: {
    canonical_name: string
    rank_tier: string
    influence: number | null
  }
}

export default function RequestsPage() {
  const [requests, setRequests] = useState<AccountRequest[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)

  useEffect(() => {
    loadRequests()
  }, [])

  const loadRequests = async () => {
    try {
      const response = await fetch(apiPath("/admin/requests"))
      if (!response.ok) throw new Error("Failed to load requests")
      const data = await response.json()
      setRequests(data.requests || [])
    } catch (err) {
      console.error("Failed to load requests:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async (id: string) => {
    setApproving(id)
    try {
      const response = await fetch(apiPath(`/admin/requests/${id}/approve`), {
        method: "POST",
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Approval failed")
      }
      setRequests(requests.filter((r) => r.id !== id))
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to approve request"
      console.error("Approval error:", err)
      alert(message)
    } finally {
      setApproving(null)
    }
  }

  const handleReject = async (id: string) => {
    if (!confirm("Reject this signup request?")) return

    setApproving(id)
    try {
      const response = await fetch(apiPath(`/admin/requests/${id}/reject`), {
        method: "POST",
      })

      if (!response.ok) throw new Error("Rejection failed")
      setRequests(requests.filter((r) => r.id !== id))
    } catch (err) {
      console.error("Rejection error:", err)
      alert("Failed to reject request")
    } finally {
      setApproving(null)
    }
  }

  if (isLoading) {
    return (
      <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4">
        <div className="py-8">
          <p className="text-bone/50 text-sm">Loading requests...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-ink pt-16 pb-bottom-nav px-4">
      <div className="max-w-4xl mx-auto py-8">
        <div className="mb-8">
          <h1 className="font-display text-2xl font-bold text-bone tracking-[0.2em] mb-2">
            Account Requests
          </h1>
          <p className="text-bone/60 text-sm">
            {requests.length} pending {requests.length === 1 ? "request" : "requests"}
          </p>
        </div>

        {requests.length === 0 ? (
          <Card className="bg-smoke/70 border-ash">
            <CardContent className="p-8 text-center">
              <p className="text-bone/50 text-sm">No pending requests</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <Card
                key={request.id}
                className="bg-smoke/70 border-ash hover:border-ember/50 transition-colors"
              >
                <CardContent className="p-4 space-y-4">
                  {/* Request Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-bone/50 uppercase tracking-[0.08em] mb-1">
                        Username Requested
                      </p>
                      <p className="font-semibold text-bone">
                        {request.username_requested}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-bone/50 uppercase tracking-[0.08em] mb-1">
                        Submitted
                      </p>
                      <p className="text-sm text-bone">
                        {new Date(request.submitted_at).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Claimed Member */}
                  <div className="bg-ash/30 rounded-lg p-3">
                    <p className="text-xs text-bone/50 uppercase tracking-[0.08em] mb-2">
                      Player Info
                    </p>
                    {request.member ? (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-bone">
                            {request.member.canonical_name}
                          </p>
                          <p className="text-xs text-bone/60">
                            {request.member.rank_tier} · {request.member.influence ? `${(request.member.influence / 1e9).toFixed(1)}B` : "—"}
                          </p>
                        </div>
                        <Badge className="bg-ember/20 text-ember text-xs">
                          ✓ Matched
                        </Badge>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-semibold text-bone">
                            {request.extracted_name}
                          </p>
                          <p className="text-xs text-bone/60">
                            Player ID: {request.extracted_player_id}
                          </p>
                        </div>
                        <Badge className="bg-bone/20 text-bone/70 text-xs">
                          ⚠ Manual match
                        </Badge>
                      </div>
                    )}
                  </div>

                  {/* OCR Extracted */}
                  <div>
                    <p className="text-xs text-bone/50 uppercase tracking-[0.08em] mb-2">
                      Extracted from Screenshot
                    </p>
                    <div className="text-xs font-mono text-bone/70 space-y-1 bg-ash/20 rounded p-2">
                      <p>Player ID: {request.extracted_player_id || "—"}</p>
                      <p>Name: {request.extracted_name || "—"}</p>
                      <p>VIP: {request.extracted_vip_level || "—"}</p>
                    </div>
                  </div>

                  {/* Recovery Email & IP */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-bone/50 mb-1">Recovery Email:</p>
                      <p className="text-bone/70">
                        {request.recovery_email || "(not provided)"}
                      </p>
                    </div>
                    <div>
                      <p className="text-bone/50 mb-1">IP Address:</p>
                      <p className="text-bone/70 font-mono">{request.ip_address}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 pt-2 border-t border-ash/50">
                    <Button
                      onClick={() => handleApprove(request.id)}
                      disabled={approving === request.id}
                      className="flex-1 bg-blood hover:bg-blood/90 text-bone font-semibold"
                    >
                      <CheckCircle2 size={16} className="mr-2" />
                      Approve
                    </Button>
                    <Button
                      onClick={() => handleReject(request.id)}
                      disabled={approving === request.id}
                      variant="outline"
                      className="flex-1 border-blood/50 text-blood hover:bg-blood/10"
                    >
                      <X size={16} className="mr-2" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </main>
  )
}
