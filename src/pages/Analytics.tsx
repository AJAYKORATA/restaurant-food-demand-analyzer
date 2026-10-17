import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Order } from '../types'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend,
} from 'recharts'
import { format, subDays, startOfDay, endOfDay, getHours } from 'date-fns'
import styles from './Analytics.module.css'

const COLORS = ['#E85D04', '#F59E0B', '#3B82F6', '#10B981', '#EC4899', '#8B5CF6', '#EF4444', '#06B6D4']

export default function Analytics() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase
      .from('orders')
      .select('*')
      .eq('status', 'delivered')
      .then(({ data }) => {
        if (data) setOrders(data as Order[])
        setLoading(false)
      })
  }, [])

  // Popular dishes
  const dishMap: Record<string, { count: number; revenue: number }> = {}
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!dishMap[item.dish_name]) dishMap[item.dish_name] = { count: 0, revenue: 0 }
      dishMap[item.dish_name].count += item.quantity
      dishMap[item.dish_name].revenue += item.unit_price * item.quantity
    })
  })
  const popularDishes = Object.entries(dishMap)
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 10)
    .map(([name, { count, revenue }]) => ({
      name: name.length > 20 ? name.slice(0, 18) + '…' : name, count, revenue
    }))

  // Peak demand by hour
  const hourMap: Record<number, number> = {}
  orders.forEach(o => {
    const h = getHours(new Date(o.ordered_at))
    hourMap[h] = (hourMap[h] || 0) + 1
  })
  const peakHours = Array.from({ length: 24 }, (_, h) => ({
    hour: `${h.toString().padStart(2, '0')}:00`,
    orders: hourMap[h] || 0,
  })).filter((_, i) => i >= 8 && i <= 23)

  // Category analysis
  const catMap: Record<string, { count: number; revenue: number }> = {}
  orders.forEach(o => {
    o.items.forEach(item => {
      const key = item.category_id || 'unknown'
      if (!catMap[key]) catMap[key] = { count: 0, revenue: 0 }
      catMap[key].count += item.quantity
      catMap[key].revenue += item.unit_price * item.quantity
    })
  })

  // Category names from orders
  const catNames: Record<string, string> = {}
  orders.forEach(o => o.items.forEach(item => {
    if (item.category_id) catNames[item.category_id] = item.category_id
  }))

  const [categories, setCategories] = useState<Record<string, string>>({})
  useEffect(() => {
    supabase.from('categories').select('id,name').then(({ data }) => {
      if (data) {
        const map: Record<string, string> = {}
        data.forEach((c: { id: string; name: string }) => { map[c.id] = c.name })
        setCategories(map)
      }
    })
  }, [])

  const categoryData = Object.entries(catMap).map(([id, { count, revenue }]) => ({
    name: categories[id] || 'Other', count, revenue
  })).sort((a, b) => b.revenue - a.revenue)

  // Daily revenue (last 14 days)
  const today = new Date()
  const daily14 = Array.from({ length: 14 }, (_, i) => {
    const day = subDays(today, 13 - i)
    const dayOrders = orders.filter(o => {
      const d = new Date(o.ordered_at)
      return d >= startOfDay(day) && d <= endOfDay(day)
    })
    return {
      day: format(day, 'MMM d'),
      revenue: dayOrders.reduce((s, o) => s + Number(o.total_amount), 0),
      orders: dayOrders.length,
    }
  })

  if (loading) return <div className={styles.loading}>Loading analytics…</div>

  return (
    <div className={styles.page}>
      <div className={styles.grid}>
        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <h3 className={styles.cardTitle}>Popular Dishes — Orders Placed</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={popularDishes}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} angle={-15} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => [v, 'Orders']} />
              <Bar dataKey="count" radius={[6,6,0,0]}>
                {popularDishes.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Category Revenue Split</h3>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={categoryData} dataKey="revenue" nameKey="name"
                cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) =>
                  `${name} ${(percent * 100).toFixed(0)}%`
                } labelLine={false}>
                {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip formatter={(v: number) => [`$${v.toFixed(2)}`, 'Revenue']} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card}>
          <h3 className={styles.cardTitle}>Peak Demand by Hour</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={peakHours}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={1} angle={-30} textAnchor="end" height={40} />
              <YAxis tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip />
              <Bar dataKey="orders" fill="var(--info)" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <h3 className={styles.cardTitle}>Daily Revenue & Orders — Last 14 Days</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={daily14}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} />
              <YAxis yAxisId="rev" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis yAxisId="ord" orientation="right" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number, name: string) => name === 'revenue' ? [`$${v.toFixed(2)}`, 'Revenue'] : [v, 'Orders']} />
              <Legend />
              <Line yAxisId="rev" type="monotone" dataKey="revenue" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line yAxisId="ord" type="monotone" dataKey="orders" stroke="var(--info)" strokeWidth={2} dot={false} strokeDasharray="4 4" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className={styles.card} style={{ gridColumn: 'span 2' }}>
          <h3 className={styles.cardTitle}>Category Performance</h3>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr><th>Category</th><th>Units Sold</th><th>Revenue</th><th>Avg per Order</th></tr>
              </thead>
              <tbody>
                {categoryData.map(c => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td>{c.count}</td>
                    <td>${c.revenue.toFixed(2)}</td>
                    <td>${c.count > 0 ? (c.revenue / c.count).toFixed(2) : '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
