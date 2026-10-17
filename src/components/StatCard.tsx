import { LucideIcon } from 'lucide-react'
import styles from './StatCard.module.css'

interface Props {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  color?: string
  trend?: { value: number; label: string }
}

export default function StatCard({ label, value, sub, icon: Icon, color = 'var(--primary)', trend }: Props) {
  return (
    <div className={styles.card}>
      <div className={styles.iconWrap} style={{ background: color + '18' }}>
        <Icon size={20} color={color} />
      </div>
      <div className={styles.body}>
        <p className={styles.label}>{label}</p>
        <p className={styles.value}>{value}</p>
        {sub && <p className={styles.sub}>{sub}</p>}
        {trend && (
          <p className={styles.trend} style={{ color: trend.value >= 0 ? 'var(--success)' : 'var(--error)' }}>
            {trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </div>
    </div>
  )
}
