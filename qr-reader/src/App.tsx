import { useState, useCallback, useRef, useEffect } from 'react'
import { Scanner } from './components/Scanner'
import { Result } from './components/Result'
import { Loading } from './components/Loading'
import type { ResultType } from './components/Result'
import './App.css'

function App() {
  const [state, setState] = useState<'idle' | 'loading' | 'result'>('idle')
  const [amount, setAmount] = useState('1200')
  const [resultType, setResultType] = useState<ResultType>('success')
  const scannerResetRef = useRef<(() => void) | null>(null)
  const processingRef = useRef(false)
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      document.documentElement.requestFullscreen()
    }
  }, [])

  const parseQrResult = (data: string): ResultType => {
    try {
      const trimmed = data.trim()
      const parsed = JSON.parse(trimmed)
      console.log('[QR Parsed]', parsed)
      if (parsed.result === 'success' || parsed.result === 'sucess') return 'success'
      if (parsed.result === 'no_balance') return 'no-balance'
      if (parsed.result === 'error') return 'expired'
      console.log('[QR] JSON valido pero sin campo result reconocido:', parsed.result)
    } catch (e) {
      console.log('[QR] No es JSON valido:', data, e)
    }
    return 'invalid'
  }

  const handleScan = useCallback((data: string) => {
    if (processingRef.current) return
    processingRef.current = true

    console.log('[QR Scanned]', data)
    setState('loading')

    const delay = 1000 + Math.random() * 1000
    setTimeout(() => {
      setState('result')
      setResultType(parseQrResult(data))

      setTimeout(() => {
        setState('idle')
        processingRef.current = false
        scannerResetRef.current?.()
      }, 2000)
    }, delay)
  }, [])

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-row">
          <div className="sube-logo">
            <span className="sube-icon">🚌</span>
            <span className="sube-text">SUBE</span>
          </div>
          <span className="subtitle">Lector QR - Transporte</span>
        </div>
      </header>

      <main className="app-main">
        <div className="split-layout">
          <div className="left-panel">
            <div className="amount-section">
              <label htmlFor="amount">Monto a cobrar</label>
              <div className="amount-input-wrapper">
                <span className="currency">$</span>
                <input
                  id="amount"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="amount-input"
                  min="0"
                />
              </div>
            </div>

            {state === 'idle' && (
              <div className="idle-message">
                <div className="idle-icon">📷</div>
                <p>Esperando lectura de QR...</p>
              </div>
            )}

            {/* Desktop: inline loading/result */}
            <div className="desktop-only">
              {state === 'loading' && <Loading />}
              {state === 'result' && (
                <Result type={resultType} amount={amount} />
              )}
            </div>
          </div>

          <div className="right-panel">
            <div className="scanner-section">
              <p className="scan-instruction">Acercá el QR del smartwatch a la cámara</p>
              <Scanner onScan={handleScan} resetRef={scannerResetRef} />
            </div>
          </div>
        </div>

        {/* Mobile: overlay on top of scanner */}
        {state === 'loading' && (
          <div className="mobile-overlay">
            <Loading />
          </div>
        )}
        {state === 'result' && (
          <div className="mobile-overlay">
            <Result type={resultType} amount={amount} />
          </div>
        )}
      </main>

      {!isFullscreen && (
        <button className="fullscreen-btn" onClick={toggleFullscreen} aria-label="Pantalla completa">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 3H5a2 2 0 0 0-2 2v3" />
            <path d="M21 8V5a2 2 0 0 0-2-2h-3" />
            <path d="M3 16v3a2 2 0 0 0 2 2h3" />
            <path d="M16 21h3a2 2 0 0 0 2-2v-3" />
          </svg>
        </button>
      )}
    </div>
  )
}

export default App
