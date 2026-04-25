import { ImageResponse } from "next/og"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"
export const alt = "ELS Event Leaderboard"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

const MINIMUM_THRESHOLD = 1700

export default async function Image({ params }: { params: { id: string } }) {
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: event } = await adminClient
    .from("events")
    .select("title")
    .eq("id", params.id)
    .single()

  const { data: scores } = await adminClient
    .from("event_scores")
    .select("member_id, points")
    .eq("event_id", params.id)
    .order("points", { ascending: false })
    .limit(5)

  const memberIds = scores?.map(s => s.member_id) || []
  const { data: members } = await adminClient
    .from("members")
    .select("id, canonical_name")
    .in("id", memberIds)

  const memberMap: Record<string, string> = {}
  members?.forEach(m => { memberMap[m.id] = m.canonical_name })

  const totalPoints = scores?.reduce((sum, s) => sum + s.points, 0) || 0

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0A0908 0%, #1a0a0a 50%, #0A0908 100%)",
          display: "flex",
          flexDirection: "column",
          padding: "60px",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Background glow */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            width: 600,
            height: 400,
            background: "radial-gradient(circle, rgba(139,0,0,0.3) 0%, transparent 70%)",
            transform: "translateX(-50%)",
            pointerEvents: "none",
          }}
        />

        {/* Top bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 40 }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#C9A227", fontSize: 14, letterSpacing: "0.3em", textTransform: "uppercase" }}>
              [ELS] ELYSIUM · Faction Call-Up
            </span>
          </div>
          <div style={{ color: "rgba(232,226,213,0.4)", fontSize: 13, letterSpacing: "0.15em" }}>
            redweyne.com/els
          </div>
        </div>

        {/* Title */}
        <div style={{ color: "#E8E2D5", fontSize: 52, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 8 }}>
          {event?.title || "FCU Leaderboard"}
        </div>

        {/* Divider */}
        <div style={{
          width: 400,
          height: 2,
          background: "linear-gradient(90deg, #C9A227, rgba(201,162,39,0.2), transparent)",
          marginBottom: 40,
        }} />

        {/* Top 3 */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>
          {(scores || []).slice(0, 3).map((score, idx) => {
            const name = memberMap[score.member_id] || "Unknown"
            const rankColors = ["#C9A227", "rgba(232,226,213,0.7)", "#92400E"]
            const bgColors = ["rgba(201,162,39,0.08)", "rgba(255,255,255,0.03)", "rgba(146,64,14,0.05)"]
            const medals = ["①", "②", "③"]

            return (
              <div
                key={score.member_id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 20,
                  background: bgColors[idx],
                  border: `1px solid ${idx === 0 ? "rgba(201,162,39,0.4)" : "rgba(255,255,255,0.06)"}`,
                  borderRadius: 12,
                  padding: "14px 20px",
                }}
              >
                <span style={{ color: rankColors[idx], fontSize: 22, fontWeight: 700, width: 30 }}>
                  {medals[idx]}
                </span>
                <span style={{ color: "#E8E2D5", fontSize: 20, fontWeight: 600, flex: 1 }}>
                  {name}
                </span>
                <span style={{ color: rankColors[idx], fontSize: 22, fontFamily: "monospace", fontWeight: 700 }}>
                  {score.points.toLocaleString()}
                </span>
                {score.points >= MINIMUM_THRESHOLD && (
                  <span style={{ color: "#C9A227", fontSize: 12, letterSpacing: "0.15em", border: "1px solid rgba(201,162,39,0.4)", borderRadius: 4, padding: "2px 8px" }}>
                    QUALIFIED
                  </span>
                )}
              </div>
            )
          })}
        </div>

        {/* Footer stats */}
        <div style={{ display: "flex", gap: 40, marginTop: 30, paddingTop: 24, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "rgba(232,226,213,0.4)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
              Total Points
            </span>
            <span style={{ color: "#C9A227", fontSize: 24, fontFamily: "monospace", fontWeight: 700 }}>
              {totalPoints.toLocaleString()}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "rgba(232,226,213,0.4)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
              Members
            </span>
            <span style={{ color: "#E8E2D5", fontSize: 24, fontFamily: "monospace", fontWeight: 700 }}>
              {scores?.length || 0}
            </span>
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "rgba(232,226,213,0.4)", fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginBottom: 4 }}>
              Min. Threshold
            </span>
            <span style={{ color: "rgba(232,226,213,0.6)", fontSize: 24, fontFamily: "monospace", fontWeight: 700 }}>
              {MINIMUM_THRESHOLD.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
