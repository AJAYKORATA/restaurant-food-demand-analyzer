import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Order, Dish } from '../types'
import { format, startOfDay, endOfDay, addDays } from 'date-fns'
import { Clock, ChefHat, AlertTriangle } from 'lucide-react'
import styles from './FoodPrep.module.css'

interface PrepItem {
  dish_id: string
  dish_name: string
  category: string
  category_color: string
  total_quantity: number
  prep_time_minutes: number
  total_prep_minutes: number
  orders_count: number
}

export default function FoodPrep() {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [orders, setOrders] = useState<Order[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [categories, setCategories] = useState<Record<string, { name: string; color: string }>>({})
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    supabase.from('categories').select('id,name,color').then(({ data }) => {
      if (data) {
        const map: Record<string, { name: string; color: string }> = {}
        data.forEach((c: { id: string; name: string; color: string }) => { map[c.id] = { name: c.name, color: c.color } })
        setCategories(map)
      }
    })
    supabase.from('dishes').select('*').then(({ data }) => {
      if (data) setDishes(data as Dish[])
    })
  }, [])

  useEffect(() => {
    setLoading(true)
    const start = startOfDay(new Date(selectedDate + 'T12:00:00')).toISOString()
    const end = endOfDay(new Date(selectedDate + 'T12:00:00')).toISOString()
    supabase
      .from('orders')
      .select('*')
      .gte('ordered_at', start)
      .lte('ordered_at', end)
      .not('status', 'eq', 'cancelled')
      .then(({ data }) => {
        if (data) setOrders(data as Order[])
        setLoading(false)
      })
  }, [selectedDate])

  // Aggregate prep needs
  const dishMap: Record<string, { qty: number; orders: Set<string> }> = {}
  orders.forEach(o => {
    o.items.forEach(item => {
      if (!dishMap[item.dish_id]) dishMap[item.dish_id] = { qty: 0, orders: new Set() }
      dishMap[item.dish_id].qty += item.quantity
      dishMap[item.dish_id].orders.add(o.id)
    })
  })

  const prepList: PrepItem[] = Object.entries(dishMap).map(([dish_id, { qty, orders: orderSet }]) => {
    const dish = dishes.find(d => d.id === dish_id)
    const cat = dish?.category_id ? categories[dish.category_id] : null
    const dish_name = dish?.name || orders.flatMap(o => o.items).find(i => i.dish_id === dish_id)?.dish_name || 'Unknown'
    const prep_time = dish?.prep_time_minutes || 15
    return {
      dish_id,
      dish_name,
      category: cat?.name || 'Other',
      category_color: cat?.color || '#9CA3AF',
      total_quantity: qty,
      prep_time_minutes: prep_time,
      total_prep_minutes: prep_time * qty,
      orders_count: orderSet.size,
    }
  }).sort((a, b) => b.total_quantity - a.total_quantity)

  const totalPrepMinutes = prepList.reduce((s, p) => s + p.total_prep_minutes, 0)
  const maxPrepItem = prepList.reduce((max, p) => p.prep_time_minutes > (max?.prep_time_minutes || 0) ? p : max, prepList[0])

  // Group by category
  const byCategory: Record<string, PrepItem[]> = {}
  prepList.forEach(p => {
    if (!byCategory[p.category]) byCategory[p.category] = []
    byCategory[p.category].push(p)
  })

  const isToday = selectedDate === format(new Date(), 'yyyy-MM-dd')
  const isFuture = new Date(selectedDate + 'T12:00:00') > new Date()

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Food Preparation Planning</h2>
          <p className={styles.sub}>Aggregate prep requirements for all non-cancelled orders</p>
        </div>
        <input
          type="date"
          value={selectedDate}
          onChange={e => setSelectedDate(e.target.value)}
          className={styles.datePicker}
        />
      </div>

      {loading ? (
        <div className={styles.loading}>Loading prep plan…</div>
      ) : (
        <>
          {isFuture && (
            <div className={styles.banner}>
              <AlertTriangle size={16} />
              Showing future orders — data may change as new orders are placed.
            </div>
          )}

          <div className={styles.summaryCards}>
            <div className={styles.summaryCard}>
              <ChefHat size={20} color="var(--primary)" />
              <div>
                <p className={styles.sumLabel}>Unique Dishes to Prep</p>
                <p className={styles.sumValue}>{prepList.length}</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <Clock size={20} color="var(--info)" />
              <div>
                <p className={styles.sumLabel}>Total Prep Time (sequential)</p>
                <p className={styles.sumValue}>{Math.floor(totalPrepMinutes / 60)}h {totalPrepMinutes % 60}m</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <Clock size={20} color="var(--warning)" />
              <div>
                <p className={styles.sumLabel}>Longest Single Item</p>
                <p className={styles.sumValue}>{maxPrepItem ? `${maxPrepItem.dish_name} (${maxPrepItem.prep_time_minutes}m)` : '—'}</p>
              </div>
            </div>
          </div>

          {prepList.length === 0 ? (
            <div className={styles.empty}>No orders to prepare on this date.</div>
          ) : (
            <>
              {Object.entries(byCategory).map(([cat, items]) => {
                const catColor = items[0]?.category_color || '#9CA3AF'
                const catTotal = items.reduce((s, i) => s + i.total_quantity, 0)
                return (
                  <div key={cat} className={styles.catSection}>
                    <div className={styles.catHeader} style={{ borderLeftColor: catColor }}>
                      <span className={styles.catName}>{cat}</span>
                      <span className={styles.catTotal}>{catTotal} units total</span>
                    </div>
                    <div className={styles.tableWrap}>
                      <table className={styles.table}>
                        <thead>
                          <tr>
                            <th>Dish</th>
                            <th>Qty Needed</th>
                            <th>From # Orders</th>
                            <th>Prep / Unit</th>
                            <th>Total Prep</th>
                            <th>Priority</th>
                          </tr>
                        </thead>
                        <tbody>
                          {items.map(p => (
                            <tr key={p.dish_id}>
                              <td className={styles.dishName}>{p.dish_name}</td>
                              <td><strong>{p.total_quantity}</strong></td>
                              <td>{p.orders_count} order{p.orders_count !== 1 ? 's' : ''}</td>
                              <td>{p.prep_time_minutes} min</td>
                              <td className={styles.totalPrep}>{p.total_prep_minutes} min</td>
                              <td>
                                <span className={styles.priority} style={{ background: priorityColor(p) + '22', color: priorityColor(p) }}>
                                  {priorityLabel(p)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )
              })}

              <div className={styles.prepTimeline}>
                <h3 className={styles.timelineTitle}>Prep Time Visualization</h3>
                <div className={styles.bars}>
                  {prepList.slice(0, 12).map(p => (
                    <div key={p.dish_id} className={styles.barRow}>
                      <span className={styles.barLabel}>{p.dish_name.length > 22 ? p.dish_name.slice(0, 20) + '…' : p.dish_name}</span>
                      <div className={styles.barTrack}>
                        <div
                          className={styles.barFill}
                          style={{
                            width: `${Math.min((p.total_prep_minutes / Math.max(...prepList.map(x => x.total_prep_minutes))) * 100, 100)}%`,
                            background: p.category_color,
                          }}
                        />
                      </div>
                      <span className={styles.barVal}>{p.total_prep_minutes}m</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  )
}

function priorityLabel(p: PrepItem) {
  if (p.total_prep_minutes >= 60 || p.total_quantity >= 10) return 'High'
  if (p.total_prep_minutes >= 30 || p.total_quantity >= 5) return 'Medium'
  return 'Low'
}

function priorityColor(p: PrepItem) {
  const l = priorityLabel(p)
  if (l === 'High') return '#EF4444'
  if (l === 'Medium') return '#F59E0B'
  return '#10B981'
}
