"use client"

import { useEffect, useRef } from "react"
import { useReducedMotion } from "framer-motion"
import { cn } from "@/lib/cn"

export interface ParticleFieldProps {
  /** Maximum particles alive at once (default 40). */
  count?: number
  /** Ember hue variants (default ["var(--ember)", "var(--ember-light)"]) */
  colors?: string[]
  /** Vertical drift direction ("up" floats up, "down" falls) */
  direction?: "up" | "down"
  /** Pixels per second base velocity (default 18) */
  speed?: number
  /** Base radius in px (default 1.6) */
  size?: number
  /** Additional max opacity 0-1 (default 0.55) */
  maxOpacity?: number
  className?: string
}

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  radius: number
  colorIdx: number
}

/**
 * Lightweight canvas ember-particle field.
 * Absolutely positioned; parent should be `relative`.
 * Pauses when the canvas is off-screen (IntersectionObserver) and when
 * prefers-reduced-motion is set.
 */
export function ParticleField({
  count = 40,
  colors = ["rgba(201, 162, 39, 0.9)", "rgba(224, 189, 77, 0.8)"],
  direction = "up",
  speed = 18,
  size = 1.6,
  maxOpacity = 0.55,
  className,
}: ParticleFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const reducedMotion = useReducedMotion()

  useEffect(() => {
    if (reducedMotion) return
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let width = 0
    let height = 0
    let dpr = 1
    const particles: Particle[] = []
    let rafId = 0
    let running = true
    let lastTime = performance.now()

    const resize = () => {
      const parent = canvas.parentElement
      if (!parent) return
      dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = parent.clientWidth
      height = parent.clientHeight
      canvas.width = width * dpr
      canvas.height = height * dpr
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const spawn = (): Particle => {
      const startY =
        direction === "up" ? height + Math.random() * 40 : -20 - Math.random() * 40
      return {
        x: Math.random() * width,
        y: startY,
        vx: (Math.random() - 0.5) * speed * 0.3,
        vy: direction === "up" ? -speed * (0.5 + Math.random()) : speed * (0.5 + Math.random()),
        life: 0,
        maxLife: 2.5 + Math.random() * 3,
        radius: size * (0.6 + Math.random() * 0.8),
        colorIdx: Math.floor(Math.random() * colors.length),
      }
    }

    const seed = () => {
      particles.length = 0
      for (let i = 0; i < count; i++) {
        const p = spawn()
        p.y = Math.random() * height
        p.life = Math.random() * p.maxLife
        particles.push(p)
      }
    }

    const step = (now: number) => {
      if (!running) return
      const dt = Math.min((now - lastTime) / 1000, 0.05)
      lastTime = now
      ctx.clearRect(0, 0, width, height)

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i]
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.life += dt
        const lifeFrac = p.life / p.maxLife
        const opacity =
          lifeFrac < 0.2
            ? (lifeFrac / 0.2) * maxOpacity
            : lifeFrac > 0.8
              ? ((1 - lifeFrac) / 0.2) * maxOpacity
              : maxOpacity

        if (
          p.life >= p.maxLife ||
          (direction === "up" && p.y < -20) ||
          (direction === "down" && p.y > height + 20)
        ) {
          Object.assign(p, spawn())
          continue
        }

        ctx.fillStyle = colors[p.colorIdx]
        ctx.globalAlpha = Math.max(0, Math.min(1, opacity))
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1
      rafId = requestAnimationFrame(step)
    }

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting && !running) {
            running = true
            lastTime = performance.now()
            rafId = requestAnimationFrame(step)
          } else if (!e.isIntersecting && running) {
            running = false
            cancelAnimationFrame(rafId)
          }
        }
      },
      { threshold: 0 },
    )

    resize()
    seed()
    rafId = requestAnimationFrame(step)
    io.observe(canvas)
    const onResize = () => {
      resize()
      seed()
    }
    window.addEventListener("resize", onResize)

    return () => {
      running = false
      cancelAnimationFrame(rafId)
      io.disconnect()
      window.removeEventListener("resize", onResize)
    }
  }, [count, colors, direction, speed, size, maxOpacity, reducedMotion])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("absolute inset-0 pointer-events-none", className)}
    />
  )
}
