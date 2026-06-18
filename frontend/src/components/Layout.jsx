import { Outlet, NavLink, useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

const NAV = [
  { to: '/',          icon: '⊞', label: 'Dashboard',        exact: true },
  { to: '/analyze',   icon: '◎', label: 'Analyze Resume' },
  { to: '/rewrite',   icon: '✦', label: 'AI Rewrite' },
  { to: '/interview', icon: '◈', label: 'Interview Prep' },
  { to: '/history',   icon: '◷', label: 'History' },
  { to: '/settings',  icon: '⚙', label: 'Settings' },
]

export default function Layout() {
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-page)' }}>
      {/* Sidebar */}
      <aside style={{
        width: 228, flexShrink: 0, background: 'var(--bg-sidebar)',
        borderRight: '1px solid var(--border)', display: 'flex',
        flexDirection: 'column', position: 'sticky', top: 0, height: '100vh',
      }}>
        {/* Brand */}
        <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--accent-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, color: 'var(--accent)' }}>◎</div>
            <div>
              <p style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>ResumeIQ</p>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.08em' }}>ATS OPTIMIZER</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px' }}>
          {[
            ...NAV,
            ...(user?.role === 'admin' ? [{ to: '/admin', icon: '⬡', label: 'Admin Panel' }] : [])
          ].map(({ to, icon, label, exact }) => (
            <NavLink key={to} to={to} end={exact} style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px',
              borderRadius: 7, marginBottom: 2, textDecoration: 'none', fontSize: 13,
              fontWeight: isActive ? 500 : 400, transition: 'all .15s',
              background: isActive ? 'var(--accent-bg)' : 'transparent',
              color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
              borderLeft: isActive ? '3px solid var(--accent)' : '3px solid transparent',
            })}>
              <span style={{ fontSize: 15, width: 18, textAlign: 'center' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User footer */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', marginBottom: 6 }}>
            <div style={{
              width: 30, height: 30, borderRadius: '50%', background: 'var(--accent-bg)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 12, fontWeight: 600, color: 'var(--accent)', flexShrink: 0,
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</p>
              <p style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'capitalize' }}>{user?.plan} plan</p>
            </div>
          </div>
          <button onClick={handleLogout} style={{
            width: '100%', padding: '7px 12px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-secondary)', fontSize: 13, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
            ↩ Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'auto', minWidth: 0 }}>
        <Outlet />
      </main>
    </div>
  )
}
