import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Order, OrderStatus, Dish, OrderItem } from '../types'
import Badge from '../components/Badge'
import { Plus, Search, Trash2, Edit2, X, Check } from 'lucide-react'
import { format } from 'date-fns'
import styles from './Orders.module.css'

const STATUSES: OrderStatus[] = ['pending', 'preparing', 'ready', 'delivered', 'cancelled']

type Filter = 'all' | OrderStatus

function OrderModal({
  order, dishes, onClose, onSave,
}: {
  order: Order | null
  dishes: Dish[]
  onClose: () => void
  onSave: () => void
}) {
  const [tableNumber, setTableNumber] = useState(order?.table_number ?? 1)
  const [status, setStatus] = useState<OrderStatus>(order?.status ?? 'pending')
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [items, setItems] = useState<OrderItem[]>(order?.items ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const addItem = (dish: Dish) => {
    const existing = items.findIndex(i => i.dish_id === dish.id)
    if (existing >= 0) {
      setItems(prev => prev.map((it, idx) => idx === existing ? { ...it, quantity: it.quantity + 1 } : it))
    } else {
      setItems(prev => [...prev, {
        dish_id: dish.id, dish_name: dish.name,
        quantity: 1, unit_price: dish.price, category_id: dish.category_id ?? '',
      }])
    }
  }

  const removeItem = (dish_id: string) => setItems(prev => prev.filter(i => i.dish_id !== dish_id))
  const updateQty = (dish_id: string, qty: number) => {
    if (qty <= 0) { removeItem(dish_id); return }
    setItems(prev => prev.map(i => i.dish_id === dish_id ? { ...i, quantity: qty } : i))
  }

  const total = items.reduce((s, i) => s + i.unit_price * i.quantity, 0)

  const handleSave = async () => {
    if (items.length === 0) { setError('Add at least one item.'); return }
    setSaving(true); setError('')
    const payload = { table_number: tableNumber, status, notes: notes || null, items, total_amount: total }
    let err
    if (order) {
      ;({ error: err } = await supabase.from('orders').update(payload).eq('id', order.id))
    } else {
      ;({ error: err } = await supabase.from('orders').insert(payload))
    }
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave()
    onClose()
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{order ? `Edit Order #${order.order_number}` : 'New Order'}</h2>
          <button onClick={onClose} className={styles.iconBtn}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <div className={styles.row2}>
            <label className={styles.field}>
              <span>Table</span>
              <input type="number" min={1} max={99} value={tableNumber}
                onChange={e => setTableNumber(Number(e.target.value))} className={styles.input} />
            </label>
            {order && (
              <label className={styles.field}>
                <span>Status</span>
                <select value={status} onChange={e => setStatus(e.target.value as OrderStatus)} className={styles.input}>
                  {STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className={styles.field}>
            <span>Menu Items</span>
            <div className={styles.dishGrid}>
              {dishes.filter(d => d.active).map(d => (
                <button key={d.id} className={styles.dishBtn} onClick={() => addItem(d)}>
                  <span>{d.name}</span>
                  <span className={styles.dishPrice}>${Number(d.price).toFixed(2)}</span>
                </button>
              ))}
            </div>
          </div>

          {items.length > 0 && (
            <div className={styles.field}>
              <span>Order Items</span>
              <div className={styles.itemsList}>
                {items.map(item => (
                  <div key={item.dish_id} className={styles.itemRow}>
                    <span className={styles.itemName}>{item.dish_name}</span>
                    <input type="number" min={1} max={99} value={item.quantity}
                      onChange={e => updateQty(item.dish_id, Number(e.target.value))}
                      className={styles.qtyInput} />
                    <span className={styles.itemSubtotal}>${(item.unit_price * item.quantity).toFixed(2)}</span>
                    <button onClick={() => removeItem(item.dish_id)} className={styles.removeBtn}><X size={14} /></button>
                  </div>
                ))}
                <div className={styles.total}>Total: <strong>${total.toFixed(2)}</strong></div>
              </div>
            </div>
          )}

          <label className={styles.field}>
            <span>Notes</span>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} className={styles.textarea} rows={2} placeholder="Allergies, special requests…" />
          </label>

          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={styles.btnPrimary}>
            {saving ? 'Saving…' : order ? 'Save Changes' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [dishes, setDishes] = useState<Dish[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [editOrder, setEditOrder] = useState<Order | null | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const [{ data: od }, { data: dd }] = await Promise.all([
      supabase.from('orders').select('*').order('ordered_at', { ascending: false }),
      supabase.from('dishes').select('*').order('name'),
    ])
    if (od) setOrders(od as Order[])
    if (dd) setDishes(dd as Dish[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const handleDelete = async (id: string) => {
    await supabase.from('orders').delete().eq('id', id)
    setDeleteId(null)
    load()
  }

  const filtered = orders.filter(o => {
    const matchStatus = filter === 'all' || o.status === filter
    const matchSearch = search === '' ||
      String(o.order_number).includes(search) ||
      String(o.table_number).includes(search) ||
      o.items.some(i => i.dish_name.toLowerCase().includes(search.toLowerCase()))
    return matchStatus && matchSearch
  })

  if (loading) return <div className={styles.loading}>Loading orders…</div>

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.searchWrap}>
          <Search size={16} className={styles.searchIcon} />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by order #, table, dish…" className={styles.searchInput} />
        </div>
        <div className={styles.filters}>
          {(['all', ...STATUSES] as Filter[]).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`${styles.filterBtn} ${filter === f ? styles.filterActive : ''}`}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <button onClick={() => setEditOrder(null)} className={styles.btnNew}>
          <Plus size={16} /> New Order
        </button>
      </div>

      <div className={styles.tableCard}>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Order #</th>
                <th>Table</th>
                <th>Items</th>
                <th>Total</th>
                <th>Status</th>
                <th>Time</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id}>
                  <td className={styles.mono}>#{o.order_number}</td>
                  <td>Table {o.table_number}</td>
                  <td className={styles.itemsCell}>
                    {o.items.slice(0, 2).map(i => `${i.dish_name} ×${i.quantity}`).join(', ')}
                    {o.items.length > 2 && ` +${o.items.length - 2} more`}
                  </td>
                  <td className={styles.mono}>${Number(o.total_amount).toFixed(2)}</td>
                  <td><Badge status={o.status} /></td>
                  <td className={styles.muted}>{format(new Date(o.ordered_at), 'MMM d, HH:mm')}</td>
                  <td>
                    <div className={styles.actions}>
                      <button onClick={() => setEditOrder(o)} className={styles.actionBtn} title="Edit"><Edit2 size={14} /></button>
                      {deleteId === o.id ? (
                        <>
                          <button onClick={() => handleDelete(o.id)} className={`${styles.actionBtn} ${styles.danger}`} title="Confirm delete"><Check size={14} /></button>
                          <button onClick={() => setDeleteId(null)} className={styles.actionBtn} title="Cancel"><X size={14} /></button>
                        </>
                      ) : (
                        <button onClick={() => setDeleteId(o.id)} className={styles.actionBtn} title="Delete"><Trash2 size={14} /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className={styles.empty}>No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editOrder !== undefined && (
        <OrderModal
          order={editOrder}
          dishes={dishes}
          onClose={() => setEditOrder(undefined)}
          onSave={load}
        />
      )}
    </div>
  )
}
