import { OrderStatus } from '../types'

const CONFIG: Record<OrderStatus, { label: string; bg: string; color: string }> = {
  pending:    { label: 'Pending',    bg: '#FEF3C7', color: '#92400E' },
  preparing:  { label: 'Preparing', bg: '#DBEAFE', color: '#1E40AF' },
  ready:      { label: 'Ready',     bg: '#D1FAE5', color: '#065F46' },
  delivered:  { label: 'Delivered', bg: '#F3F4F6', color: '#374151' },
  cancelled:  { label: 'Cancelled', bg: '#FEE2E2', color: '#991B1B' },
}

export default function Badge({ status }: { status: OrderStatus }) {
  const { label, bg, color } = CONFIG[status] || CONFIG.pending
  return (
    <span style={{
      background: bg, color,
      padding: '3px 8px',
      borderRadius: '5px',
      fontSize: '11px',
      fontWeight: 600,
      letterSpacing: '0.03em',
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
