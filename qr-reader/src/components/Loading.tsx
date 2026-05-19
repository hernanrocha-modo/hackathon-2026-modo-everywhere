import './Loading.css'

export function Loading() {
  return (
    <div className="loading-screen">
      <div className="loading-card">
        <div className="spinner" />
        <p className="loading-text">Procesando pago...</p>
      </div>
    </div>
  )
}
