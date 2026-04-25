import React from "react"
import { AlertTriangle, Wifi, RefreshCw } from "lucide-react"
import { Button } from "./button"

interface NetworkErrorProps {
  onRetry?: () => void
  message?: string
  isOffline?: boolean
}

export function NetworkError({ onRetry, message, isOffline = false }: NetworkErrorProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4">
      <div className="rounded-lg bg-blood/10 border border-blood/30 p-6 space-y-4 max-w-sm w-full text-center">
        {isOffline ? (
          <Wifi size={32} className="mx-auto text-blood" />
        ) : (
          <AlertTriangle size={32} className="mx-auto text-blood" />
        )}
        <div>
          <h3 className="font-semibold text-bone mb-1">
            {isOffline ? "You're Offline" : "Connection Error"}
          </h3>
          <p className="text-sm text-bone/70">
            {message || (isOffline
              ? "Check your internet connection and try again."
              : "Something went wrong. Please try again.")}
          </p>
        </div>
        {onRetry && (
          <Button
            onClick={onRetry}
            className="w-full bg-blood hover:bg-blood/80"
          >
            <RefreshCw size={16} className="mr-2" />
            Try Again
          </Button>
        )}
      </div>
    </div>
  )
}

export function useNetworkState() {
  const [isOnline, setIsOnline] = React.useState(true)
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return { isOnline, isLoading, setIsLoading, error, setError }
}
