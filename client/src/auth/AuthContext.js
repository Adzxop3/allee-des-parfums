import { createContext, useContext } from 'react'

// { user, checking, refresh, login, register, logout, deleteAccount } — voir AuthProvider.jsx
export const AuthContext = createContext(null)

export function useAuth() {
  return useContext(AuthContext)
}
