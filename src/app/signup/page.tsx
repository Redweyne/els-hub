"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FormField } from "@/components/ui/form-field"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, AlertCircle, CheckCircle2 } from "lucide-react"
import { apiPath, appPath } from "@/lib/paths"

interface OCRResult {
  player_id: string
  player_name: string
  faction_tag: string
}

export default function SignupPage() {
  const [step, setStep] = useState<"upload" | "password" | "submitted">("upload")
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [screenshotPreview, setScreenshotPreview] = useState<string>("")
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null)
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [email, setEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")

  const handleScreenshotChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScreenshot(file)
    setError("")

    // Preview
    const reader = new FileReader()
    reader.onload = (event) => {
      setScreenshotPreview(event.target?.result as string)
    }
    reader.readAsDataURL(file)

    // OCR
    setIsLoading(true)
    try {
      const formData = new FormData()
      formData.append("screenshot", file)

      const response = await fetch(apiPath("/signup/ocr"), {
        method: "POST",
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error("OCR error:", response.status, errorText)
        throw new Error(`OCR failed: ${response.status}`)
      }

      const data = await response.json()
      console.log("OCR result:", data)
      setOcrResult(data.ocr)

      // Generate email based on faction (lowercase, no spaces)
      const emailName = data.ocr.player_name.replace(/\s+/g, "").toLowerCase()
      const generatedEmail =
        data.ocr.faction_tag === "ELS"
          ? `${emailName}@els.com`
          : `${emailName}@guest.com`
      setEmail(generatedEmail)

      // Pre-fill username without spaces
      const usernameFromName = data.ocr.player_name.replace(/\s+/g, "")
      setUsername(usernameFromName)

      setStep("password")
    } catch (err) {
      setError("Failed to extract account information. Please try a clearer screenshot of your Account page.")
      console.error(err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!username || !password || !ocrResult) {
      setError("Username and password are required")
      return
    }

    if (username.length < 3) {
      setError("Username must be at least 3 characters")
      return
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters")
      return
    }

    setIsLoading(true)
    try {
      const response = await fetch(apiPath("/signup/submit"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          username,
          password,
          player_id: ocrResult.player_id,
          player_name: ocrResult.player_name,
          faction_tag: ocrResult.faction_tag,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Signup failed")
      }
      setStep("submitted")
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to create account"
      setError(message)
      console.error("Signup error:", err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-ink pt-16 pb-28 px-4">
      <div className="max-w-3xl mx-auto py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-bone tracking-[0.25em] mb-2">
            JOIN THE TRACKER
          </h1>
          <p className="text-bone/60 text-sm">Create your account to track performance</p>
        </div>

        {step === "upload" && (
          <div className="space-y-8">
            {/* Instructions Card */}
            <Card className="bg-ember/10 border-ember/30">
              <CardContent className="p-6 space-y-4">
                <h2 className="font-semibold text-bone">How to find your Account screenshot:</h2>
                <ol className="text-sm text-bone/70 space-y-2 list-decimal list-inside">
                  <li>Open The Grand Mafia game</li>
                  <li>Go to Settings → Account</li>
                  <li>Take a screenshot showing your Player ID, name, and faction</li>
                  <li>Upload it below</li>
                </ol>
                <p className="text-xs text-bone/50 italic pt-2">
                  Your linked socials can be blurred if you prefer
                </p>
              </CardContent>
            </Card>

            {/* Example Screenshot */}
            <div>
              <p className="text-sm font-semibold text-bone mb-3">Example (screenshot of your Account page):</p>
              <Card className="bg-smoke/70 border-ash overflow-hidden">
                <CardContent className="p-0">
                  <img
                    src={appPath("/images/account-example.png")}
                    alt="Example account screenshot"
                    className="w-full max-h-96 object-cover rounded-lg"
                  />
                </CardContent>
              </Card>
            </div>

            {/* Upload Area */}
            <Card className="bg-smoke/70 border-ash">
              <CardContent className="p-6 space-y-6">
                <div>
                  <label className="block text-sm font-semibold text-bone mb-3">
                    Upload Your Account Screenshot
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      disabled={isLoading}
                      className="hidden"
                      id="screenshot-input"
                    />
                    <label
                      htmlFor="screenshot-input"
                      className={`flex items-center justify-center gap-3 border-2 border-dashed border-ash rounded-lg p-8 cursor-pointer transition-colors ${
                        isLoading ? "opacity-50" : "hover:border-ember"
                      }`}
                    >
                      <Upload size={24} className="text-bone/60" />
                      <div className="text-center">
                        <p className="text-sm font-semibold text-bone">
                          {screenshot ? screenshot.name : "Click to upload or drag & drop"}
                        </p>
                        <p className="text-xs text-bone/50 mt-1">PNG, JPG up to 10MB</p>
                      </div>
                    </label>
                  </div>
                </div>

                {screenshotPreview && (
                  <div>
                    <p className="text-xs text-bone/70 mb-2">Your screenshot:</p>
                    <img
                      src={screenshotPreview}
                      alt="Uploaded screenshot"
                      className="max-w-full max-h-64 rounded-lg border border-ash"
                    />
                  </div>
                )}

                {ocrResult && (
                  <div className="bg-ember/10 border border-ember/30 rounded-lg p-4 space-y-2">
                    <p className="text-sm font-semibold text-ember">✓ Information extracted:</p>
                    <div className="text-xs text-bone/70 space-y-1 font-mono">
                      <p>Player: {ocrResult.player_name}</p>
                      <p>ID: {ocrResult.player_id}</p>
                      <p>Faction: {ocrResult.faction_tag}</p>
                    </div>
                  </div>
                )}

                {error && (
                  <div className="flex gap-2 bg-blood/10 border border-blood/30 rounded-lg p-3">
                    <AlertCircle size={16} className="text-blood flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blood">{error}</p>
                  </div>
                )}

                {ocrResult && (
                  <button
                    onClick={() => setStep("password")}
                    className="w-full bg-blood hover:bg-blood/90 text-bone font-semibold py-3 rounded-lg transition-colors"
                    disabled={isLoading}
                  >
                    {isLoading ? "Processing..." : "Continue"}
                  </button>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {step === "password" && (
          <Card className="bg-smoke/70 border-ash">
            <CardContent className="p-6 space-y-6">
              <div>
                <p className="text-sm font-semibold text-bone mb-2">Player name:</p>
                <p className="text-lg font-bold text-ember">{ocrResult?.player_name}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-bone mb-2">
                    Email (read-only)
                  </label>
                  <input
                    type="text"
                    value={email}
                    disabled
                    className="w-full bg-ash/50 border border-ash text-bone/70 py-2 px-3 rounded-lg"
                  />
                  <p className="text-xs text-bone/50 mt-1">
                    {ocrResult?.faction_tag === "ELS"
                      ? "ELS members use @els.com"
                      : "Guest accounts use @guest.com"}
                  </p>
                </div>

                <FormField
                  label="Username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Min 3 characters, no spaces"
                  disabled={isLoading}
                  required
                  error={username && username.length < 3 ? "Username must be at least 3 characters" : ""}
                  showValidation={username.length > 0}
                  isValid={username.length >= 3}
                  helperText="Auto-filled from your in-game name (spaces removed). Edit if needed."
                />

                <FormField
                  label="Password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  disabled={isLoading}
                  required
                  error={password && password.length < 8 ? "Password must be at least 8 characters" : ""}
                  showValidation={password.length > 0}
                  isValid={password.length >= 8}
                  helperText="Create a strong password"
                />

                {error && (
                  <div className="flex gap-2 bg-blood/10 border border-blood/30 rounded-lg p-3">
                    <AlertCircle size={16} className="text-blood flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-blood">{error}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setStep("upload")
                      setUsername("")
                      setPassword("")
                    }}
                    disabled={isLoading}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-blood hover:bg-blood/90 text-bone font-semibold py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {isLoading ? "Creating..." : "Create Account"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {step === "submitted" && (
          <Card className="bg-smoke/70 border-blood/40">
            <CardContent className="p-6 space-y-4 text-center">
              <CheckCircle2 size={48} className="text-blood mx-auto" />
              <div>
                <h2 className="font-semibold text-bone text-lg mb-2">Account Created</h2>
                <p className="text-sm text-bone/70 mb-4">
                  Your account is in preview mode. Redweyne will contact you directly in-game to verify your identity and finalize your account.
                </p>
                <p className="text-xs text-bone/50">
                  You can browse the public dashboard while your account is pending verification.
                </p>
              </div>
              <Link href="/">
                <Button className="w-full bg-blood hover:bg-blood/90">
                  Go to Dashboard
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  )
}
