import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)

  const login = (userData) => setUser(userData)
  const logout = () => {
    window.db.session.clear()
    setUser(null)
  }

  const can = (action) => {
    if (!user) return false
    const perms = {
      superadmin: ['weighing','masters','reports','settings','users','delete','reset'],
      admin:      ['weighing','masters','reports','settings','users','delete'],
      operator:   ['weighing','reports:view'],
    }
    return perms[user.role]?.includes(action) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, login, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)