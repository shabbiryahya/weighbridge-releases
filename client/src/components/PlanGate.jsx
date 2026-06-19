import { usePlan } from '../hooks/usePlan'

export default function PlanGate({ feature, children, fallback }) {
  const { can, plan } = usePlan()

  if (can(feature)) return children

  const PLAN_NAMES = {
    migration:   'Pro',
    eod_email:   'Pro',
    sync:        'Pro',
    export:      'Pro',
    multi_weighbridge: 'Enterprise',
    priority_support:  'Enterprise',
  }

  const requiredPlan = PLAN_NAMES[feature] || 'Pro'

  if (fallback) return fallback

  return (
    <div style={{
      background: '#fafafa',
      border: '2px dashed #e0e0e0',
      borderRadius: 12,
      padding: '40px 24px',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: 40, marginBottom: 12 }}>🔒</div>
      <div style={{ fontWeight: 700, fontSize: 16, color: '#1a1a2e', marginBottom: 6 }}>
        {requiredPlan} Plan Required
      </div>
      <div style={{ fontSize: 14, color: '#888', marginBottom: 20 }}>
        This feature is not available on your current <strong>{plan}</strong> plan.
      </div>
      <div style={{
        background: '#fff8e1', border: '1px solid #ff9800',
        borderRadius: 8, padding: '10px 16px',
        fontSize: 13, color: '#cc7a00', display: 'inline-block',
      }}>
        Contact developer to upgrade your plan
      </div>
    </div>
  )
}