import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { Dish, Category } from '../types'
import { Plus, Edit2, Trash2, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'
import styles from './Menu.module.css'

function DishModal({ dish, categories, onClose, onSave }: {
  dish: Dish | null
  categories: Category[]
  onClose: () => void
  onSave: () => void
}) {
  const [name, setName] = useState(dish?.name ?? '')
  const [categoryId, setCategoryId] = useState(dish?.category_id ?? categories[0]?.id ?? '')
  const [price, setPrice] = useState(dish?.price?.toString() ?? '')
  const [prepTime, setPrepTime] = useState(dish?.prep_time_minutes?.toString() ?? '15')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async () => {
    if (!name.trim()) { setError('Name is required'); return }
    if (!price || isNaN(Number(price))) { setError('Valid price required'); return }
    setSaving(true); setError('')
    const payload = { name: name.trim(), category_id: categoryId || null, price: Number(price), prep_time_minutes: Number(prepTime) }
    const { error: err } = dish
      ? await supabase.from('dishes').update(payload).eq('id', dish.id)
      : await supabase.from('dishes').insert(payload)
    setSaving(false)
    if (err) { setError(err.message); return }
    onSave(); onClose()
  }

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{dish ? 'Edit Dish' : 'Add Dish'}</h2>
          <button onClick={onClose} className={styles.iconBtn}><X size={18} /></button>
        </div>
        <div className={styles.modalBody}>
          <label className={styles.field}>
            <span>Name</span>
            <input value={name} onChange={e => setName(e.target.value)} className={styles.input} placeholder="Dish name" />
          </label>
          <div className={styles.row2}>
            <label className={styles.field}>
              <span>Category</span>
              <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={styles.input}>
                {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
            <label className={styles.field}>
              <span>Price ($)</span>
              <input type="number" min="0" step="0.5" value={price} onChange={e => setPrice(e.target.value)} className={styles.input} />
            </label>
          </div>
          <label className={styles.field}>
            <span>Prep Time (minutes)</span>
            <input type="number" min="1" value={prepTime} onChange={e => setPrepTime(e.target.value)} className={styles.input} />
          </label>
          {error && <p className={styles.error}>{error}</p>}
        </div>
        <div className={styles.modalFooter}>
          <button onClick={onClose} className={styles.btnSecondary}>Cancel</button>
          <button onClick={handleSave} disabled={saving} className={styles.btnPrimary}>
            {saving ? 'Saving…' : dish ? 'Save' : 'Add Dish'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Menu() {
  const [dishes, setDishes] = useState<Dish[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [editDish, setEditDish] = useState<Dish | null | undefined>(undefined)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [activeCat, setActiveCat] = useState<string>('all')

  const load = useCallback(async () => {
    const [{ data: dd }, { data: cd }] = await Promise.all([
      supabase.from('dishes').select('*, category:categories(id,name,color)').order('name'),
      supabase.from('categories').select('*').order('name'),
    ])
    if (dd) setDishes(dd as Dish[])
    if (cd) setCategories(cd as Category[])
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  const toggleActive = async (dish: Dish) => {
    await supabase.from('dishes').update({ active: !dish.active }).eq('id', dish.id)
    load()
  }

  const handleDelete = async (id: string) => {
    await supabase.from('dishes').delete().eq('id', id)
    setDeleteId(null)
    load()
  }

  const filtered = activeCat === 'all' ? dishes : dishes.filter(d => d.category_id === activeCat)

  if (loading) return <div className={styles.loading}>Loading menu…</div>

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={styles.cats}>
          <button onClick={() => setActiveCat('all')} className={`${styles.catBtn} ${activeCat === 'all' ? styles.catActive : ''}`}>All</button>
          {categories.map(c => (
            <button key={c.id} onClick={() => setActiveCat(c.id)}
              className={`${styles.catBtn} ${activeCat === c.id ? styles.catActive : ''}`}
              style={activeCat === c.id ? { background: c.color, borderColor: c.color, color: '#fff' } : {}}>
              {c.name}
            </button>
          ))}
        </div>
        <button onClick={() => setEditDish(null)} className={styles.btnNew}>
          <Plus size={16} /> Add Dish
        </button>
      </div>

      <div className={styles.grid}>
        {filtered.map(d => (
          <div key={d.id} className={`${styles.dishCard} ${!d.active ? styles.inactive : ''}`}>
            <div className={styles.dishHeader}>
              <div className={styles.catDot} style={{ background: (d.category as any)?.color || '#9CA3AF' }} />
              <span className={styles.catLabel}>{(d.category as any)?.name || 'Uncategorized'}</span>
              <div className={styles.dishActions}>
                <button onClick={() => toggleActive(d)} className={styles.iconBtn} title={d.active ? 'Deactivate' : 'Activate'}>
                  {d.active ? <ToggleRight size={18} color="var(--success)" /> : <ToggleLeft size={18} color="var(--text-muted)" />}
                </button>
                <button onClick={() => setEditDish(d)} className={styles.iconBtn}><Edit2 size={14} /></button>
                {deleteId === d.id ? (
                  <>
                    <button onClick={() => handleDelete(d.id)} className={`${styles.iconBtn} ${styles.danger}`}><Check size={14} /></button>
                    <button onClick={() => setDeleteId(null)} className={styles.iconBtn}><X size={14} /></button>
                  </>
                ) : (
                  <button onClick={() => setDeleteId(d.id)} className={styles.iconBtn}><Trash2 size={14} /></button>
                )}
              </div>
            </div>
            <h4 className={styles.dishName}>{d.name}</h4>
            <div className={styles.dishMeta}>
              <span className={styles.price}>${Number(d.price).toFixed(2)}</span>
              <span className={styles.prep}>{d.prep_time_minutes} min</span>
            </div>
            {!d.active && <span className={styles.inactiveTag}>Inactive</span>}
          </div>
        ))}
        {filtered.length === 0 && <p className={styles.empty}>No dishes in this category</p>}
      </div>

      {editDish !== undefined && (
        <DishModal dish={editDish} categories={categories} onClose={() => setEditDish(undefined)} onSave={load} />
      )}
    </div>
  )
}
