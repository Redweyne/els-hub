// Accessibility utilities and helpers

/**
 * Generate an aria-label from context
 * Use for icon-only buttons, links, and interactive elements
 */
export const ariaLabels = {
  closeModal: "Close dialog",
  openMenu: "Open menu",
  login: "Log in to your account",
  signup: "Sign up for an account",
  logout: "Log out",
  goBack: "Go back to previous page",
  refresh: "Refresh data",
  search: "Search members",
  filter: "Filter results",
  sort: "Sort results",
  nextPage: "Go to next page",
  previousPage: "Go to previous page",
  deleteItem: "Delete this item",
  editItem: "Edit this item",
  viewDetails: "View full details",
  copyLink: "Copy link to clipboard",
  share: "Share this",
  download: "Download file",
  upload: "Upload file",
  expandSection: "Expand section",
  collapseSection: "Collapse section",
} as const

/**
 * Announce dynamic content changes to screen readers
 */
export function announceToScreenReader(
  message: string,
  priority: "polite" | "assertive" = "polite"
) {
  const announcement = document.createElement("div")
  announcement.setAttribute("role", "status")
  announcement.setAttribute("aria-live", priority)
  announcement.setAttribute("aria-atomic", "true")
  announcement.className = "sr-only"
  announcement.textContent = message

  document.body.appendChild(announcement)
  setTimeout(() => document.body.removeChild(announcement), 3000)
}

/**
 * Skip to main content link helper
 */
export const skipLinkId = "skip-to-main"

/**
 * Focus management helpers
 */
export function focusElement(elementId: string) {
  const element = document.getElementById(elementId)
  if (element) {
    element.focus()
  }
}

/**
 * Trap focus within a modal
 */
export function trapFocusInElement(containerElement: HTMLElement) {
  const focusableElements = containerElement.querySelectorAll(
    "button, [href], input, select, textarea, [tabindex]:not([tabindex=\"-1\"])"
  )
  const firstElement = focusableElements[0] as HTMLElement
  const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key !== "Tab") return

    if (e.shiftKey) {
      if (document.activeElement === firstElement) {
        lastElement.focus()
        e.preventDefault()
      }
    } else {
      if (document.activeElement === lastElement) {
        firstElement.focus()
        e.preventDefault()
      }
    }
  }

  containerElement.addEventListener("keydown", handleKeyDown)
  firstElement.focus()

  return () => {
    containerElement.removeEventListener("keydown", handleKeyDown)
  }
}

/**
 * Keyboard navigation helper for custom components
 */
export function createKeyboardHandler(config: {
  onEnter?: () => void
  onEscape?: () => void
  onArrowUp?: () => void
  onArrowDown?: () => void
  onSpace?: () => void
}) {
  return (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Enter":
        config.onEnter?.()
        break
      case "Escape":
        config.onEscape?.()
        break
      case "ArrowUp":
        config.onArrowUp?.()
        e.preventDefault()
        break
      case "ArrowDown":
        config.onArrowDown?.()
        e.preventDefault()
        break
      case " ":
        config.onSpace?.()
        e.preventDefault()
        break
    }
  }
}
