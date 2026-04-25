// Cinematic easing curves optimized for smooth, film-like motion
export const easingCurves = {
  // Slow start and end - dramatic pause effect
  easeInOutQuart: [0.77, 0, 0.175, 1],
  // Fast start, slow end - cinematic emphasis
  easeOutQuart: [0.165, 0.84, 0.44, 1],
  // Slow start, fast end - anticipation
  easeInQuart: [0.9, 0.03, 0.69, 0.22],
  // Smooth, natural motion
  easeInOutCubic: [0.645, 0.045, 0.355, 1],
  // Linear fallback (don't use often)
  linear: "linear",
} as const

// Standard transition durations (in milliseconds)
export const transitionDurations = {
  instant: 0,
  fast: 150,
  quick: 200,
  normal: 300,
  smooth: 400,
  slow: 600,
  verySlow: 900,
} as const

// Framer Motion variants for common animations
export const animations = {
  // Fade + scale entrance
  fadeInScale: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.95 },
    transition: { duration: transitionDurations.normal / 1000, ease: "easeOut" },
  },

  // Fade + slide up entrance (common for mobile)
  fadeInUp: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 16 },
    transition: { duration: transitionDurations.normal / 1000, ease: "easeOut" },
  },

  // Fade + slide down entrance
  fadeInDown: {
    initial: { opacity: 0, y: -16 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -16 },
    transition: { duration: transitionDurations.normal / 1000, ease: "easeOut" },
  },

  // Fade + slide left entrance
  fadeInLeft: {
    initial: { opacity: 0, x: -16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -16 },
    transition: { duration: transitionDurations.normal / 1000, ease: "easeOut" },
  },

  // Fade + slide right entrance
  fadeInRight: {
    initial: { opacity: 0, x: 16 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 16 },
    transition: { duration: transitionDurations.normal / 1000, ease: "easeOut" },
  },

  // Simple fade
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: transitionDurations.quick / 1000 },
  },

  // Stagger container for lists
  staggerContainer: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { staggerChildren: 0.05, delayChildren: 0.1 },
  },

  // Stagger child item
  staggerItem: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: transitionDurations.normal / 1000 },
  },

  // Loading pulse
  pulse: {
    initial: { opacity: 0.5 },
    animate: { opacity: 1 },
    transition: { duration: 1, repeat: Infinity, repeatType: "reverse" as const },
  },
} as const

// Utility function for sequential animation delays
export function getStaggerDelay(index: number, baseDelay = 0.05): number {
  return index * baseDelay
}
