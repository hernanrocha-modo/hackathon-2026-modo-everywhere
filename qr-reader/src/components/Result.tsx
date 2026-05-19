export type ResultType = 'success' | 'no-balance' | 'expired' | 'invalid'

interface ResultProps {
  type: ResultType
  amount: string
}

const resultConfig = {
  success: {
    icon: '\u2705',
    title: 'Pago exitoso',
    message: 'El viaje fue cobrado correctamente.',
  },
  'no-balance': {
    icon: '\u26A0\uFE0F',
    title: 'Saldo insuficiente',
    message: 'La cuenta no tiene saldo suficiente para este viaje.',
  },
  expired: {
    icon: '\u274C',
    title: 'Error',
    message: 'No se pudo procesar el pago. Intenta nuevamente.',
  },
  invalid: {
    icon: '\u{1F6AB}',
    title: 'QR invalido',
    message: 'El codigo QR no corresponde a un medio de pago SUBE.',
  },
}

export function Result({ type, amount }: ResultProps) {
  const config = resultConfig[type]

  return (
    <div className="result-screen">
      <div className={`result-card ${type}`}>
        <div className="result-icon">{config.icon}</div>
        <h2 className="result-title">{config.title}</h2>
        <p className="result-message">{config.message}</p>
        {type === 'success' && (
          <div className="result-amount">${amount}</div>
        )}
      </div>
    </div>
  )
}
