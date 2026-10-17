import { BrowserRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { LayoutDashboard, ClipboardList, BarChart2, UtensilsCrossed, BookOpen, ChefHat, Menu as MenuIcon, X } from 'lucide-react'
import { useState } from 'react'
import Dashboard from './pages/Dashboard'
import Orders from './pages/Orders'
import Analytics from './pages/Analytics'
import MenuPage from './pages/Menu'
import DailyReport from './pages/DailyReport'
import FoodPrep from './pages/FoodPrep'
import styles from './App.module.css'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/orders', icon: ClipboardList, label: 'Orders' },
  { to: '/analytics', icon: BarChart2, label: 'Analytics' },
  { to: '/menu', icon: UtensilsCrossed, label: 'Menu' },
  { to: '/daily-report', icon: BookOpen, label: 'Daily Report' },
  { to: '/food-prep', icon: ChefHat, label: 'Food Prep' },
]

function Sidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <>
      {open && <div className={styles.overlay} onClick={onClose} />}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.logo}>
          <UtensilsCrossed size={22} color="var(--primary)" />
          <span>RestaurantOS</span>
        </div>
        <nav className={styles.nav}>
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => `${styles.navItem} ${isActive ? styles.navActive : ''}`}
              onClick={onClose}
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className={styles.sidebarFooter}>
          <span>v1.0</span>
        </div>
      </aside>
    </>
  )
}

function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const location = useLocation()
  const page = NAV.find(n => n.to === location.pathname) || NAV[0]
  return (
    <header className={styles.topbar}>
      <button className={styles.menuBtn} onClick={onMenuClick} aria-label="Toggle menu">
        <MenuIcon size={20} />
      </button>
      <h1 className={styles.pageTitle}>{page.label}</h1>
    </header>
  )
}

function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  return (
    <div className={styles.layout}>
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className={styles.main}>
        <TopBar onMenuClick={() => setSidebarOpen(o => !o)} />
        <main className={styles.content}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<Orders />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/menu" element={<MenuPage />} />
            <Route path="/daily-report" element={<DailyReport />} />
            <Route path="/food-prep" element={<FoodPrep />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  )
}
