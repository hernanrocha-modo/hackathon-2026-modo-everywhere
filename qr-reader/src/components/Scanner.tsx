import { useEffect, useRef, useCallback } from 'react'
import type { MutableRefObject } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface ScannerProps {
  onScan: (data: string) => void
  resetRef: MutableRefObject<(() => void) | null>
}

function getVideoTrack(): MediaStreamTrack | null {
  const video = document.querySelector('#qr-scanner-region video') as HTMLVideoElement | null
  if (!video?.srcObject) return null
  const stream = video.srcObject as MediaStream
  return stream.getVideoTracks()[0] || null
}

export function Scanner({ onScan, resetRef }: ScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const isRunningRef = useRef(false)
  const pausedRef = useRef(false)
  const lastScannedRef = useRef('')
  const zoomRef = useRef(1)
  const pinchStartDistRef = useRef(0)
  const pinchStartZoomRef = useRef(1)
  const zoomRangeRef = useRef({ min: 1, max: 1 })

  // Tap to focus: tries multiple strategies for Android compatibility
  const handleTapToFocus = useCallback((e: MouseEvent | TouchEvent) => {
    const track = getVideoTrack()
    if (!track) return

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capabilities = track.getCapabilities() as any
    const supportedModes: string[] = capabilities.focusMode || []

    console.log('[Scanner] Focus modes available:', supportedModes)

    // Get tap coordinates relative to video for pointOfInterest
    const video = document.querySelector('#qr-scanner-region video') as HTMLVideoElement | null
    let poiConstraint: Record<string, unknown> | null = null
    if (video && 'pointOfInterest' in capabilities) {
      const rect = video.getBoundingClientRect()
      const clientX = 'touches' in e ? e.touches[0]?.clientX ?? rect.left + rect.width / 2 : (e as MouseEvent).clientX
      const clientY = 'touches' in e ? e.touches[0]?.clientY ?? rect.top + rect.height / 2 : (e as MouseEvent).clientY
      const x = (clientX - rect.left) / rect.width
      const y = (clientY - rect.top) / rect.height
      poiConstraint = { pointOfInterest: { x, y } }
      console.log('[Scanner] Using pointOfInterest:', x.toFixed(2), y.toFixed(2))
    }

    // Strategy 1: single-shot (best for tap-to-focus on Android)
    if (supportedModes.includes('single-shot')) {
      const constraints = { focusMode: 'single-shot', ...poiConstraint }
      track.applyConstraints({ advanced: [constraints] } as MediaTrackConstraints)
        .then(() => console.log('[Scanner] single-shot focus triggered'))
        .catch(() => {})
      return
    }

    // Strategy 2: switch to manual then back to continuous to force refocus
    if (supportedModes.includes('manual') && supportedModes.includes('continuous')) {
      track.applyConstraints({ advanced: [{ focusMode: 'manual', ...poiConstraint }] } as MediaTrackConstraints)
        .then(() => {
          setTimeout(() => {
            track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] } as MediaTrackConstraints)
              .catch(() => {})
          }, 300)
        })
        .catch(() => {})
      console.log('[Scanner] manual→continuous focus triggered')
      return
    }

    // Strategy 3: just re-apply continuous to nudge autofocus
    if (supportedModes.includes('continuous')) {
      track.applyConstraints({ advanced: [{ focusMode: 'continuous', ...poiConstraint }] } as MediaTrackConstraints)
        .then(() => console.log('[Scanner] continuous focus re-applied'))
        .catch(() => {})
    }
  }, [])

  // Apply zoom
  const applyZoom = useCallback((zoom: number) => {
    const track = getVideoTrack()
    if (!track) return

    const { min, max } = zoomRangeRef.current
    if (min >= max) return

    const clamped = Math.min(Math.max(zoom, min), max)
    zoomRef.current = clamped

    track.applyConstraints({ advanced: [{ zoom: clamped } as MediaTrackConstraintSet] } as MediaTrackConstraints)
      .catch(() => {})
  }, [])

  // Pinch to zoom handlers
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      pinchStartDistRef.current = Math.hypot(dx, dy)
      pinchStartZoomRef.current = zoomRef.current
    }
  }, [])

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)

      if (pinchStartDistRef.current > 0) {
        const scale = dist / pinchStartDistRef.current
        applyZoom(pinchStartZoomRef.current * scale)
      }
    }
  }, [applyZoom])

  useEffect(() => {
    const scannerId = 'qr-scanner-region'
    const scanner = new Html5Qrcode(scannerId)
    scannerRef.current = scanner

    const isMobile = window.innerWidth <= 768
    const qrboxSize = isMobile ? 200 : 250

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: qrboxSize, height: qrboxSize },
          aspectRatio: 1,
        },
        (decodedText) => {
          if (pausedRef.current) return
          if (decodedText === lastScannedRef.current) return
          lastScannedRef.current = decodedText
          pausedRef.current = true
          onScan(decodedText)
        },
        () => {},
      )
      .then(() => {
        isRunningRef.current = true

        // Read zoom capabilities once camera is running
        const track = getVideoTrack()
        if (track) {
          const capabilities = track.getCapabilities() as MediaTrackCapabilities & { zoom?: { min: number; max: number; step: number } }
          if (capabilities.zoom) {
            zoomRangeRef.current = { min: capabilities.zoom.min, max: capabilities.zoom.max }
            console.log('[Scanner] Zoom range:', capabilities.zoom.min, '-', capabilities.zoom.max)
          } else {
            console.log('[Scanner] Zoom not supported by this camera')
          }

          const caps = capabilities as MediaTrackCapabilities & { focusMode?: string[] }
          if (caps.focusMode) {
            console.log('[Scanner] Focus modes:', caps.focusMode)
          } else {
            console.log('[Scanner] Focus control not supported by this camera')
          }
        }
      })
      .catch((err: unknown) => {
        console.error('Error starting scanner:', err)
      })

    return () => {
      if (isRunningRef.current) {
        scanner.stop().catch(() => {})
        isRunningRef.current = false
      }
    }
  }, [onScan])

  // Attach touch events to scanner region
  useEffect(() => {
    const el = document.getElementById('qr-scanner-region')
    if (!el) return

    const focusHandler = (e: Event) => handleTapToFocus(e as MouseEvent | TouchEvent)

    el.addEventListener('touchstart', handleTouchStart, { passive: true })
    el.addEventListener('touchmove', handleTouchMove, { passive: false })
    el.addEventListener('click', focusHandler)

    return () => {
      el.removeEventListener('touchstart', handleTouchStart)
      el.removeEventListener('touchmove', handleTouchMove)
      el.removeEventListener('click', focusHandler)
    }
  }, [handleTouchStart, handleTouchMove, handleTapToFocus])

  useEffect(() => {
    resetRef.current = () => {
      pausedRef.current = false
      lastScannedRef.current = ''
    }
  }, [resetRef])

  const handleZoomIn = useCallback(() => {
    applyZoom(zoomRef.current + 0.5)
  }, [applyZoom])

  const handleZoomOut = useCallback(() => {
    applyZoom(zoomRef.current - 0.5)
  }, [applyZoom])

  return (
    <div className="scanner-container">
      <div
        id="qr-scanner-region"
        className="scanner-region"
      />
      <div className="zoom-controls">
        <button className="zoom-btn" onClick={handleZoomOut} aria-label="Zoom out">−</button>
        <span className="zoom-label">Zoom</span>
        <button className="zoom-btn" onClick={handleZoomIn} aria-label="Zoom in">+</button>
      </div>
    </div>
  )
}
