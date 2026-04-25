import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { IconButton } from "@/components/ui/icon-button"
import {
  ELSEmblemV2,
  RankStar,
  RankStarsRow,
  LaurelWreath,
  OrnateDivider,
  FactionCrestFrame,
  FilmStripEdge,
  MedalSVG,
  TrophySVG,
  FactionCallUpGlyph,
  GloryOfOakvaleGlyph,
  GovernorsWarGlyph,
} from "@/components/heraldry"
import { Eyebrow, DisplayHeading, Numeric } from "@/components/typography"
import { Bell, Search, Settings, Plus, Heart } from "lucide-react"

export default function DesignPage() {
  return (
    <main className="film-grain bg-ink min-h-screen px-6 py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-display text-5xl text-bone mb-12 tracking-[0.35em]">
          Design System
        </h1>

        {/* Color palette */}
        <section className="mb-16">
          <h2 className="font-display text-3xl text-bone mb-6 tracking-[0.2em]">
            Palette
          </h2>
          <div className="grid grid-cols-2 gap-4 md:grid-cols-6">
            <div className="rounded-lg bg-ink border border-ash p-4">
              <div className="text-xs text-bone/50">ink</div>
              <div className="text-xs text-bone font-mono">#0a0908</div>
            </div>
            <div className="rounded-lg bg-blood p-4">
              <div className="text-xs text-bone/50">blood</div>
              <div className="text-xs text-bone font-mono">#8b0000</div>
            </div>
            <div className="rounded-lg bg-ember p-4">
              <div className="text-xs text-ink">ember</div>
              <div className="text-xs text-ink font-mono">#c9a227</div>
            </div>
            <div className="rounded-lg bg-bone p-4">
              <div className="text-xs text-ink">bone</div>
              <div className="text-xs text-ink font-mono">#e8e2d5</div>
            </div>
            <div className="rounded-lg bg-smoke border border-ash p-4">
              <div className="text-xs text-bone/50">smoke</div>
              <div className="text-xs text-bone font-mono">#2c2c2c</div>
            </div>
            <div className="rounded-lg bg-ash border border-ash/50 p-4">
              <div className="text-xs text-bone/50">ash</div>
              <div className="text-xs text-bone/50 font-mono">rgba(255,255,255,0.08)</div>
            </div>
          </div>
        </section>

        {/* Typography */}
        <section className="mb-16">
          <h2 className="font-display text-3xl text-bone mb-6 tracking-[0.2em]">
            Typography
          </h2>
          <div className="space-y-6">
            <div>
              <p className="font-display text-4xl text-bone tracking-[0.35em] mb-2">
                Display — Cormorant Garamond
              </p>
              <p className="text-xs text-bone/50">Headings, dramatic text</p>
            </div>
            <div>
              <p className="font-body text-base text-bone mb-2">
                Body — Inter
              </p>
              <p className="text-xs text-bone/50">UI text, readable body copy</p>
            </div>
            <div>
              <p className="font-mono text-sm text-ember mb-2 tabular">
                12,345,678 — JetBrains Mono
              </p>
              <p className="text-xs text-bone/50">Numbers, code, tabular data</p>
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="mb-16">
          <h2 className="font-display text-3xl text-bone mb-6 tracking-[0.2em]">
            Components
          </h2>
          <Tabs defaultValue="buttons" className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-smoke">
              <TabsTrigger value="buttons">Buttons</TabsTrigger>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="badges">Badges</TabsTrigger>
              <TabsTrigger value="inputs">Inputs</TabsTrigger>
            </TabsList>

            <TabsContent value="buttons" className="space-y-4 mt-6">
              <div className="flex flex-wrap gap-4">
                <Button className="bg-blood hover:bg-blood/90">Primary</Button>
                <Button variant="outline" className="border-ember text-ember hover:bg-ember/10">
                  Secondary
                </Button>
                <Button variant="ghost" className="text-bone hover:bg-bone/10">
                  Ghost
                </Button>
                <Button variant="destructive">Destructive</Button>
              </div>
            </TabsContent>

            <TabsContent value="cards" className="space-y-4 mt-6">
              <Card className="bg-smoke border-ash">
                <CardHeader>
                  <CardTitle className="text-bone">Card Title</CardTitle>
                  <CardDescription className="text-bone/50">
                    This is a card with cinematic styling.
                  </CardDescription>
                </CardHeader>
                <CardContent className="text-bone/70">
                  Cards inherit the smoke background and ash borders from our design tokens.
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="badges" className="space-y-4 mt-6">
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blood text-bone">Rank Tier</Badge>
                <Badge className="bg-ember text-ink">Family Role</Badge>
                <Badge variant="outline" className="border-bone/30 text-bone">
                  Status
                </Badge>
              </div>
            </TabsContent>

            <TabsContent value="inputs" className="space-y-4 mt-6">
              <Input placeholder="Enter username..." className="border-ash text-bone placeholder:text-bone/30" />
              <Input type="password" placeholder="Enter password..." className="border-ash text-bone placeholder:text-bone/30" />
            </TabsContent>
          </Tabs>
        </section>

        {/* Avatar */}
        <section className="mb-16">
          <h2 className="font-display text-3xl text-bone mb-6 tracking-[0.2em]">
            Avatar
          </h2>
          <div className="flex gap-4">
            <Avatar>
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback className="bg-smoke text-bone">RW</AvatarFallback>
            </Avatar>
            <Avatar>
              <AvatarFallback className="bg-blood text-bone">EL</AvatarFallback>
            </Avatar>
          </div>
        </section>

        {/* Utilities */}
        <section className="mb-16">
          <h2 className="font-display text-3xl text-bone mb-6 tracking-[0.2em]">
            Utilities
          </h2>
          <div className="space-y-4">
            <div className="rounded-lg film-grain bg-ink border border-ember p-6 h-32 flex items-end">
              <p className="text-xs text-bone/50">film-grain overlay</p>
            </div>
            <div className="rounded-lg bg-ink bg-ember-glow p-6 h-32 flex items-end">
              <p className="text-xs text-bone/50">bg-ember-glow</p>
            </div>
            <div className="rounded-lg bg-ink bg-blood-glow p-6 h-32 flex items-end">
              <p className="text-xs text-bone/50">bg-blood-glow</p>
            </div>
          </div>
        </section>

        {/* ==================================================================
            E1 — BREATHTAKING SHOWROOM
            All new components shipped in Phase 1.5 milestone E1.
           ================================================================== */}

        <section className="pt-16 pb-8">
          <OrnateDivider variant="fleur" label="Phase 1.5 · Elevation" />
        </section>

        <section className="mb-16">
          <Eyebrow tone="ember" size="sm">The Heraldry</Eyebrow>
          <DisplayHeading level={2} className="mt-2 mb-8">Emblem & Insignia</DisplayHeading>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <ELSEmblemV2 size={160} glow starCount={5} idScope="showroom-1" />
              <Eyebrow tone="muted">Full · Glow · 5 stars</Eyebrow>
            </div>
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <ELSEmblemV2 size={160} variant="mark" idScope="showroom-2" />
              <Eyebrow tone="muted">Mark variant</Eyebrow>
            </div>
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <ELSEmblemV2 size={160} variant="stripped" idScope="showroom-3" />
              <Eyebrow tone="muted">Stripped · tower only</Eyebrow>
            </div>
          </div>

          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="surface-2 rounded-lg p-4 flex flex-col items-center gap-3">
              <RankStar size={28} />
              <Eyebrow tone="muted">RankStar</Eyebrow>
            </div>
            <div className="surface-2 rounded-lg p-4 flex flex-col items-center gap-3">
              <RankStarsRow count={5} filled={5} size={18} />
              <Eyebrow tone="muted">Class S · 5/5</Eyebrow>
            </div>
            <div className="surface-2 rounded-lg p-4 flex flex-col items-center gap-3">
              <RankStarsRow count={5} filled={3} size={18} />
              <Eyebrow tone="muted">Class A · 3/5</Eyebrow>
            </div>
            <div className="surface-2 rounded-lg p-4 flex flex-col items-center gap-3">
              <LaurelWreath size={80} />
              <Eyebrow tone="muted">LaurelWreath</Eyebrow>
            </div>
          </div>

          <div className="mt-10 space-y-6">
            <OrnateDivider variant="solid" label="Solid" />
            <OrnateDivider variant="fleur" label="Fleur" />
            <OrnateDivider variant="dotted" label="Dotted" />
          </div>

          <div className="mt-10">
            <FactionCrestFrame className="surface-3 rounded-xl p-8" innerClassName="text-center">
              <Eyebrow tone="ember">Faction Crest Frame</Eyebrow>
              <DisplayHeading level={3} className="mt-2">Ornate corner brackets wrap any container</DisplayHeading>
              <p className="text-bone/60 text-sm mt-3 max-w-lg mx-auto">
                Four art-deco L-brackets, absolutely positioned, decorative only — your content flows freely inside.
              </p>
            </FactionCrestFrame>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface-3 rounded-xl p-4 relative h-32 overflow-hidden">
              <FilmStripEdge orientation="vertical" holeCount={10} className="absolute left-0 top-0 bottom-0" />
              <FilmStripEdge orientation="vertical" holeCount={10} className="absolute right-0 top-0 bottom-0" />
              <div className="px-8 h-full flex items-center">
                <Eyebrow tone="ember">Film Strip Edge · vertical</Eyebrow>
              </div>
            </div>
            <div className="surface-3 rounded-xl p-4 relative h-32 overflow-hidden">
              <FilmStripEdge orientation="horizontal" holeCount={16} className="absolute top-0 left-0 right-0" />
              <FilmStripEdge orientation="horizontal" holeCount={16} className="absolute bottom-0 left-0 right-0" />
              <div className="py-6 h-full flex items-center px-6">
                <Eyebrow tone="ember">Film Strip Edge · horizontal</Eyebrow>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <Eyebrow tone="ember" size="sm">Event Glyphs</Eyebrow>
          <DisplayHeading level={2} className="mt-2 mb-8">Event Identity</DisplayHeading>
          <div className="grid grid-cols-3 gap-4">
            <div className="surface-2 rounded-lg p-6 flex flex-col items-center gap-3">
              <FactionCallUpGlyph size={72} />
              <Eyebrow tone="muted">Faction Call-Up</Eyebrow>
            </div>
            <div className="surface-2 rounded-lg p-6 flex flex-col items-center gap-3">
              <GloryOfOakvaleGlyph size={72} />
              <Eyebrow tone="muted">Glory of Oakvale</Eyebrow>
            </div>
            <div className="surface-2 rounded-lg p-6 flex flex-col items-center gap-3">
              <GovernorsWarGlyph size={72} />
              <Eyebrow tone="muted">Governor's War</Eyebrow>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <Eyebrow tone="ember" size="sm">Honors</Eyebrow>
          <DisplayHeading level={2} className="mt-2 mb-8">Medals & Trophies</DisplayHeading>

          <div className="grid grid-cols-3 gap-4 mb-10">
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <MedalSVG tier="gold" rank={1} size={80} idScope="showroom-gold" />
              <Eyebrow tone="muted">Gold · 1st</Eyebrow>
            </div>
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <MedalSVG tier="silver" rank={2} size={80} idScope="showroom-silver" />
              <Eyebrow tone="muted">Silver · 2nd</Eyebrow>
            </div>
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <MedalSVG tier="bronze" rank={3} size={80} idScope="showroom-bronze" />
              <Eyebrow tone="muted">Bronze · 3rd</Eyebrow>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <TrophySVG tier="gold" size={96} idScope="tr-g" />
              <Eyebrow tone="muted">Gold trophy</Eyebrow>
            </div>
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <TrophySVG tier="silver" size={96} idScope="tr-s" />
              <Eyebrow tone="muted">Silver</Eyebrow>
            </div>
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <TrophySVG tier="bronze" size={96} idScope="tr-b" />
              <Eyebrow tone="muted">Bronze</Eyebrow>
            </div>
            <div className="surface-3 rounded-xl p-6 flex flex-col items-center gap-3">
              <TrophySVG tier="slate" size={96} idScope="tr-sl" />
              <Eyebrow tone="muted">Slate · 4+</Eyebrow>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <Eyebrow tone="ember" size="sm">Type System</Eyebrow>
          <DisplayHeading level={2} className="mt-2 mb-8">Typography</DisplayHeading>
          <div className="surface-2 rounded-xl p-8 space-y-8">
            <div className="space-y-2">
              <Eyebrow tone="muted">Hero · display 1</Eyebrow>
              <DisplayHeading level={1}>Elysium</DisplayHeading>
            </div>
            <div className="space-y-2">
              <Eyebrow tone="muted">Section · display 2</Eyebrow>
              <DisplayHeading level={2}>Active Event</DisplayHeading>
            </div>
            <div className="space-y-2">
              <Eyebrow tone="muted">Sub · display 3</Eyebrow>
              <DisplayHeading level={3}>Top Performers</DisplayHeading>
            </div>
            <div className="space-y-2">
              <Eyebrow tone="muted">Tight variant</Eyebrow>
              <DisplayHeading level={2} variant="tight">201.5 Billion</DisplayHeading>
            </div>
            <div className="space-y-2">
              <Eyebrow tone="muted">Gradient tone</Eyebrow>
              <DisplayHeading level={2} tone="gradient">Breathtaking</DisplayHeading>
            </div>

            <div className="pt-4 border-t border-ash space-y-3">
              <Eyebrow tone="muted">Numeric · compact, animated</Eyebrow>
              <div className="flex flex-wrap gap-6">
                <div>
                  <Eyebrow tone="muted" size="xs">Influence</Eyebrow>
                  <div className="text-2xl text-ember font-bold"><Numeric value={201464099634} /></div>
                </div>
                <div>
                  <Eyebrow tone="muted" size="xs">Members</Eyebrow>
                  <div className="text-2xl text-ember font-bold"><Numeric value={92} format="raw" /></div>
                </div>
                <div>
                  <Eyebrow tone="muted" size="xs">Points</Eyebrow>
                  <div className="text-2xl text-ember font-bold"><Numeric value={4369404683} /></div>
                </div>
                <div>
                  <Eyebrow tone="muted" size="xs">Qualified</Eyebrow>
                  <div className="text-2xl text-ember font-bold"><Numeric value={87.3} format="percentage" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <Eyebrow tone="ember" size="sm">Icon Button</Eyebrow>
          <DisplayHeading level={2} className="mt-2 mb-8">Icon Buttons</DisplayHeading>
          <div className="surface-2 rounded-xl p-6 flex flex-wrap gap-3 items-center">
            <IconButton label="Search" icon={<Search size={20} />} />
            <IconButton label="Notifications" icon={<Bell size={20} />} badge={3} />
            <IconButton label="Settings" icon={<Settings size={20} />} tone="ember" />
            <IconButton label="New" icon={<Plus size={20} />} tone="blood" />
            <IconButton label="Like" icon={<Heart size={20} />} tone="ghost" />
            <IconButton label="Alerts" icon={<Bell size={20} />} badge={127} tone="ember" />
            <IconButton label="Small" icon={<Plus size={16} />} size="sm" />
            <IconButton label="Large" icon={<Plus size={24} />} size="lg" />
          </div>
        </section>

        <section className="mb-16">
          <Eyebrow tone="ember" size="sm">Surface Tokens</Eyebrow>
          <DisplayHeading level={2} className="mt-2 mb-8">Depth & Texture</DisplayHeading>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="surface-1 rounded-lg p-6 h-28 flex items-end border border-ash">
              <Eyebrow tone="muted">.surface-1 — base</Eyebrow>
            </div>
            <div className="surface-2 rounded-lg p-6 h-28 flex items-end">
              <Eyebrow tone="muted">.surface-2 — lifted</Eyebrow>
            </div>
            <div className="surface-3 rounded-lg p-6 h-28 flex items-end">
              <Eyebrow tone="muted">.surface-3 — elevated</Eyebrow>
            </div>
            <div className="parchment rounded-lg p-6 h-28 flex items-end border border-ash">
              <Eyebrow tone="muted">.parchment — officer</Eyebrow>
            </div>
          </div>
        </section>

        <section className="mb-16">
          <Eyebrow tone="ember" size="sm">Motion Utilities</Eyebrow>
          <DisplayHeading level={2} className="mt-2 mb-8">Living Surfaces</DisplayHeading>
          <div className="surface-2 rounded-xl p-6 relative overflow-hidden h-64 flex items-center justify-center">
            <div className="aurora-orb-ember" style={{ top: "-20%", left: "10%" }} />
            <div className="aurora-orb-blood" style={{ bottom: "-30%", right: "-10%" }} />
            <div className="relative z-10 text-center">
              <Eyebrow tone="ember">.aurora-orb-ember · .aurora-orb-blood</Eyebrow>
              <DisplayHeading level={3} className="mt-2">Behind every hero</DisplayHeading>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="surface-2 rounded-lg p-4 space-y-3">
              <Eyebrow tone="muted">.shimmer</Eyebrow>
              <div className="shimmer h-6 rounded" />
              <div className="shimmer h-4 rounded w-3/4" />
              <div className="shimmer h-4 rounded w-1/2" />
            </div>
            <div className="surface-2 rounded-lg p-4 flex flex-col items-center justify-center gap-3">
              <button className="breath px-6 py-3 bg-blood text-bone rounded-lg font-semibold">
                .breath CTA
              </button>
              <Eyebrow tone="muted">3.2s breathing pulse</Eyebrow>
            </div>
            <div className="surface-2 rounded-lg p-4 film-grain-drift flex items-center justify-center">
              <Eyebrow tone="muted">.film-grain-drift</Eyebrow>
            </div>
          </div>
        </section>

        <section className="pt-8 pb-16">
          <OrnateDivider variant="fleur" label="Showroom · End" />
        </section>
      </div>
    </main>
  )
}
