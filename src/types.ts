export interface Category {
  id: string
  name: string
  color: string
  created_at: string
}

export interface Dish {
  id: string
  name: string
  category_id: string | null
  price: number
  prep_time_minutes: number
  active: boolean
  created_at: string
  category?: Category
}

export interface OrderItem {
  dish_id: string
  dish_name: string
  quantity: number
  unit_price: number
  category_id: string
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled'

export interface Order {
  id: string
  order_number: number
  table_number: number
  status: OrderStatus
  items: OrderItem[]
  total_amount: number
  notes: string | null
  ordered_at: string
  completed_at: string | null
  created_at: string
}
