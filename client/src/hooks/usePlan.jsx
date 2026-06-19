import { createContext, useContext, useState, useEffect } from 'react'

const PlanContext = createContext(null)

export function PlanProvider({ children }) {
  const [plan, setPlan] = useState('basic')

  useEffect(() => {
    window.db.settings.getAll().then(s => {
      setPlan(s.license_plan || 'basic')
    })
  }, [])

  const can = (feature) => {
    const PLAN_FEATURES = {
      basic: [
        'weighing',
        'masters',
        'reports',
        'printing',
      ],
      pro: [
        'weighing',
        'masters',
        'reports',
        'printing',
        'migration',
        'eod_email',
        'sync',
        'export',
        'users_5',
      ],
      enterprise: [
        'weighing',
        'masters',
        'reports',
        'printing',
        'migration',
        'eod_email',
        'sync',
        'export',
        'users_unlimited',
        'multi_weighbridge',
        'priority_support',
      ],
    }
    return PLAN_FEATURES[plan]?.includes(feature) ?? false
  }

  return (
    <PlanContext.Provider value={{ plan, can }}>
      {children}
    </PlanContext.Provider>
  )
}

export const usePlan = () => useContext(PlanContext)