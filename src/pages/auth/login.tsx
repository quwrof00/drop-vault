'use client'

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase-client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export default function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.signInWithPassword({ email, password })

    setIsLoading(false)
    if (error) {
      setError(error.message)
      toast.error(error.message)
    } else {
      toast.success('Login successful!')
      navigate('/main')
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'http://localhost:3000/reset-password',
    })

    setIsLoading(false)
    if (error) {
      setError(error.message)
      toast.error(error.message)
    } else {
      toast.success('Reset link sent! Check your email.')
      setShowReset(false)
      setResetEmail('')
    }
  }

  return (
    <main className="min-h-screen bg-gray-700 p-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-800 border border-gray-600 rounded-lg p-8 shadow-md">
        <h2 className="text-2xl font-semibold text-gray-200 mb-6 text-center">
          {showReset ? 'Reset Password' : 'Login'}
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-300 text-lg font-medium animate-pulse">Loading...</p>
            </div>
          </div>
        ) : !showReset ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 ease-in-out font-semibold text-sm tracking-wide"
            >
              Login
            </button>
            <p
              className="text-sm text-gray-400 hover:text-gray-300 underline cursor-pointer text-center transition-colors duration-200"
              onClick={() => setShowReset(true)}
            >
              Forgot password?
            </p>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Enter your email"
                className="w-full p-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 ease-in-out font-semibold text-sm tracking-wide"
            >
              Send Reset Link
            </button>
            <p
              className="text-sm text-gray-400 hover:text-gray-300 underline Hope cursor-pointer text-center transition-colors duration-200"
              onClick={() => setShowReset(false)}
            >
              Back to Login
            </p>
          </form>
        )}
      </div>
    </main>
  )
}