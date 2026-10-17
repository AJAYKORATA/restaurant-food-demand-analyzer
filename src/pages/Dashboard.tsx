import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Order } from '../types'
import StatCard from '../components/StatCard'
import Badge from '../components/Badge'
import { DollarSign, ShoppingBag, Clock, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import { format, subDays, startOfDay, endOfDay } from 'date-fns'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .order('ordered_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error && data) setOrders(data as Order[])
        setLoading(false)
      })
  }, [])

  const today = new Date()
  const todayOrders = orders.filter(o => {
    const d = new Date(o.ordered_at)
    return d >= startOfDay(today) && d <= endOfDay(today)
  })
  const todayRevenue = todayOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total_amount), 0)
  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing').length
  const totalRevenue = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total_amount), 0)

  // Last 7 days revenue chart
  const last7 = Array.from({ length: 7 }, (_, i) => {
    const day = subDays(today, 6 - i)
    const dayOrders = orders.filter(o => {
      const d = new Date(o.ordered_at)
      return d >= startOfDay(day) && d <= endOfDay(day) && o.status === 'delivered'
    })
    return {
      day: format(day, 'EEE'),
      revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      orders: dayOrders.length,
    }
  })

  // Top dishes from all orders
  const dishCount: Record<string, number> = {}
  orders.filter(o => o.status === 'delivered').forEach(o => {
    o.items.forEach(item => {
      dishCount[item.dish_name] = (dishCount[item.dish_name] || 0) + item.quantity
    })
  })
  const topDishes = Object.entries(dishCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, count]) => ({ name: name.length > 18 ? name.slice(0, 16) + '…' : name, count }))

  const recent = orders.slice(0, 8)

  if (loading) return <div className={styles.loading}>Loading dashboard...</div>

  return (
    <div className={styles.page}>
      <div className={styles.stats}>
        <StatCard label="Today's Revenue" value={`$${todayRevenue.toFixed(2)}`} icon={DollarSign} color="var(--primary)" sub="Delivered orders only" />
        <StatCard label="Total Revenue" value={`$${totalRevenue.toFixed(0)}`} icon={TrendingUp} color="var(--success)" sub="All time" />
        <StatCard label="Today's Orders" value={todayOrders.length} icon={ShoppingBag} color="var(--info)" sub={`${todayOrders.filter(o=>o.status==='delivered').length} delivered`} />
        <StatCard label="Active Orders" value={pendingCount} icon={Clock} color="var(--warning)" sub="Pending + preparing" />
      </div>

      <div className={styles.charts}>
        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Revenue — Last 7 Days</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={last7}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
              <Bar dataKey="revenue" fill="var(--primary)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.chartCard}>
          <h3 className={styles.chartTitle}>Top Dishes (All Time)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={topDishes} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={110} />
              <Tooltip />
              <Bar dataKey="count" fill="var(--accent)" radius={[0,6,6,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className={styles.recentCard}>
        <h3 className={styles.chartTitle}>Recent Orders</h3>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>Table</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {recent.map(o => (
                <tr key={o.id}>
                  <td className={styles.mono}>#{o.order_number}</td>
                  <td>T{o.table_number}</td>
                  <td>{o.items.length} item{o.items.length !== 1 ? 's' : ''}</td>
                  <td className={styles.mono}>${Number(o.total_amount).toFixed(2)}</td>
                  <td><Badge status={o.status} /></td>
                  <td className={styles.muted}>{format(new Date(o.ordered_at), 'MMM d, HH:mm')}</td>
                </tr>
              ))}
              {recent.length === 0 && (
                <tr><td colSpan={6} className={styles.empty}>No orders yet</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
