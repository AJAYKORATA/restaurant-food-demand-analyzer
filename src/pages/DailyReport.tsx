import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Order } from '../types'
import { format, startOfDay, endOfDay, subDays } from 'date-fns'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import styles from './DailyReport.module.css'

export default function DailyReport() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    const start = startOfDay(new Date(selectedDate + 'T12:00:00')).toISOString()
    const end = endOfDay(new Date(selectedDate + 'T12:00:00')).toISOString()
    supabase
      .from('orders')
      .select('*')
      .gte('ordered_at', start)
      .lte('ordered_at', end)
      .order('ordered_at')
      .then(({ data }) => {
        if (data) setOrders(data as Order[])
        setLoading(false)
      })
  }, [selectedDate])

  const delivered = orders.filter(o => o.status === 'delivered')
  const cancelled = orders.filter(o => o.status === 'cancelled')
  const revenue = delivered.reduce((s, o) => s + Number(o.total_amount), 0)
  const avgOrder = delivered.length > 0 ? revenue / delivered.length : 0

  // Dish breakdown for the day
  const dishMap: Record<string, { count: number; revenue: number }> = {}
  delivered.forEach(o => {
    o.items.forEach(item => {
      if (!dishMap[item.dish_name]) dishMap[item.dish_name] = { count: 0, revenue: 0 }
      dishMap[item.dish_name].count += item.quantity
      dishMap[item.dish_name].revenue += item.unit_price * item.quantity
    })
  })
  const dishBreakdown = Object.entries(dishMap)
    .sort((a, b) => b[1].count - a[1].count)
    .map(([name, v]) => ({ name: name.length > 22 ? name.slice(0, 20) + '…' : name, ...v }))

  // Hourly orders
  const hourly = Array.from({ length: 16 }, (_, i) => {
    const h = i + 8
    const count = orders.filter(o => new Date(o.ordered_at).getHours() === h).length
    return { hour: `${h.toString().padStart(2, '0')}:00`, count }
  })

  // Status breakdown
  const statusCounts = orders.reduce((acc, o) => {
    acc[o.status] = (acc[o.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Daily Report</h2>
          <p className={styles.sub}>Detailed breakdown for a single day</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          max={format(new Date(), 'yyyy-MM-dd')}
          onChange={e => setSelectedDate(e.target.value)}
          className={styles.datePicker}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Loading report…</div>
      ) : (
        <>
          <div className={styles.stats}>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Total Orders</p>
              <p className={styles.statValue}>{orders.length}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Delivered</p>
              <p className={styles.statValue} style={{ color: 'var(--success)' }}>{delivered.length}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Cancelled</p>
              <p className={styles.statValue} style={{ color: 'var(--error)' }}>{cancelled.length}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Revenue</p>
              <p className={styles.statValue} style={{ color: 'var(--primary)' }}>${revenue.toFixed(2)}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Avg Order Value</p>
              <p className={styles.statValue}>${avgOrder.toFixed(2)}</p>
            </div>
            <div className={styles.statCard}>
              <p className={styles.statLabel}>Unique Tables</p>
              <p className={styles.statValue}>{new Set(orders.map(o => o.table_number)).size}</p>
            </div>
          </div>

          <div className={styles.charts}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Hourly Orders</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={hourly}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" height={40} />
                  <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--primary)" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Order Status</h3>
              <div className={styles.statusList}>
                {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status} className={styles.statusRow}>
                    <span className={styles.statusLabel}>{status.charAt(0).toUpperCase() + status.slice(1)}</span>
                    <div className={styles.statusBar}>
                      <div className={styles.statusFill}
                        style={{ width: `${orders.length > 0 ? (count / orders.length) * 100 : 0}%`, background: statusColor(status) }} />
                    </div>
                    <span className={styles.statusCount}>{count}</span>
                  </div>
                ))}
                {orders.length === 0 && <p className={styles.empty}>No orders on this date</p>}
              </div>
            </div>
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>Dish Breakdown</h3>
            {dishBreakdown.length === 0 ? (
              <p className={styles.empty}>No delivered orders on this date</p>
            ) : (
              <div className={styles.tableWrap}>
                <table className={styles.table}>
                  <thead><tr><th>Dish</th><th>Qty Sold</th><th>Revenue</th><th>Revenue %</th></tr></thead>
                  <tbody>
                    {dishBreakdown.map(d => (
                      <tr key={d.name}>
                        <td>{d.name}</td>
                        <td>{d.count}</td>
                        <td>${d.revenue.toFixed(2)}</td>
                        <td>
                          <div className={styles.pctBar}>
                            <div className={styles.pctFill} style={{ width: `${revenue > 0 ? (d.revenue / revenue) * 100 : 0}%` }} />
                            <span>{revenue > 0 ? ((d.revenue / revenue) * 100).toFixed(1) : '0'}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className={styles.card}>
            <h3 className={styles.cardTitle}>All Orders</h3>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead><tr><th>#</th><th>Table</th><th>Status</th><th>Items</th><th>Total</th><th>Time</th></tr></thead>
                <tbody>
                  {orders.map(o => (
                    <tr key={o.id}>
                      <td>#{o.order_number}</td>
                      <td>T{o.table_number}</td>
                      <td><span style={{ color: statusColor(o.status), fontWeight: 600 }}>{o.status}</span></td>
                      <td>{o.items.map(i => `${i.dish_name} ×${i.quantity}`).join(', ')}</td>
                      <td>${Number(o.total_amount).toFixed(2)}</td>
                      <td>{format(new Date(o.ordered_at), 'HH:mm')}</td>
                    </tr>
                  ))}
                  {orders.length === 0 && <tr><td colSpan={6} className={styles.empty}>No orders</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function statusColor(status: string) {
  const map: Record<string, string> = {
    delivered: 'var(--success)', cancelled: 'var(--error)',
    preparing: 'var(--info)', pending: 'var(--warning)', ready: '#8B5CF6',
  }
  return map[status] || 'var(--text-secondary)'
}
