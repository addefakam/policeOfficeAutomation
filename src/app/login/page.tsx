'use client'

import { useState, Suspense } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Shield, AlertCircle, Loader2 } from 'lucide-react'

const DEMO_ACCOUNTS = [
  { username: 'admin', password: 'admin123', role: 'System Administrator', color: 'bg-red-100 text-red-800', desc: 'Full access to all features' },
  { username: 'commander', password: 'cmd123', role: 'Station Commander', color: 'bg-purple-100 text-purple-800', desc: 'View all cases, approve leaves' },
  { username: 'abebe', password: 'abebe123', role: 'Investigator', color: 'bg-blue-100 text-blue-800', desc: 'Manage assigned cases only' },
  { username: 'haile', password: 'haile123', role: 'Investigator', color: 'bg-blue-100 text-blue-800', desc: 'Manage assigned cases only' },
  { username: 'clerk1', password: 'clerk123', role: 'Clerk', color: 'bg-gray-100 text-gray-800', desc: 'Register FIRs, view dashboard' },
]

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const router = useRouter()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('Invalid username or password. Please try again.')
      } else {
        router.push(callbackUrl)
        router.refresh()
      }
    } catch {
      setError('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fillCredentials = (u: string, p: string) => {
    setUsername(u)
    setPassword(p)
    setError('')
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
        {/* Left side - Info */}
        <div className="hidden lg:block">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Police Department</h1>
              <p className="text-sm text-gray-500">Office Automation System</p>
            </div>
          </div>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Secure case management, personnel tracking, and operational
            reporting for law enforcement. All actions are logged with full
            audit trail for accountability.
          </p>

          {/* Demo Accounts Table */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700">Demo Accounts (click to autofill)</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  onClick={() => fillCredentials(account.username, account.password)}
                  className="w-full px-4 py-3 hover:bg-blue-50 transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${account.color}`}>
                      {account.role}
                    </span>
                    <div>
                      <div className="text-sm font-mono font-medium text-gray-900">{account.username}</div>
                      <div className="text-xs text-gray-500">{account.desc}</div>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 font-mono">{account.password}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Right side - Login Form */}
        <div className="w-full max-w-md mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
            {/* Mobile header */}
            <div className="flex items-center gap-3 mb-8 lg:hidden">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">Police System</h1>
              </div>
            </div>

            <h2 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the system</p>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Username
                </label>
                <input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading || !username || !password}
                className="w-full bg-blue-600 text-white py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign in'
                )}
              </button>
            </form>
          </div>

          {/* Mobile demo accounts */}
          <div className="lg:hidden mt-4 bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
              <h3 className="text-xs font-semibold text-gray-500">DEMO ACCOUNTS (tap to autofill)</h3>
            </div>
            <div className="divide-y divide-gray-100">
              {DEMO_ACCOUNTS.map((account) => (
                <button
                  key={account.username}
                  onClick={() => fillCredentials(account.username, account.password)}
                  className="w-full px-4 py-2.5 hover:bg-blue-50 transition-colors text-left flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${account.color}`}>
                      {account.role}
                    </span>
                    <span className="text-xs font-mono text-gray-700">{account.username}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">{account.password}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}