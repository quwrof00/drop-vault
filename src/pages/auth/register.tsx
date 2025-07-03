'use client'

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase-client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'

export default function RegisterPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    const { data: existingUsers, error: userFetchError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)

    if (userFetchError) {
      setIsLoading(false)
      setError('Failed to check existing users.')
      toast.error('Failed to check existing users.')
      return
    }

    if (existingUsers?.length > 0) {
      setIsLoading(false)
      setError('Email is already registered!')
      toast.error('Email is already registered!')
      return
    }

    const { error: signupError } = await supabase.auth.signUp({ email, password })

    setIsLoading(false)
    if (signupError) {
      setError(signupError.message)
      toast.error(signupError.message)
    } else {
      toast.success('Registration successful! Kindly verify your email.')
      navigate('/login')
    }
  }

  return (
    <main className="min-h-screen bg-gray-700 p-8 flex items-center justify-center">
      <div className="w-full max-w-md bg-gray-800 border border-gray-600 rounded-lg p-8 shadow-md">
        <h2 className="text-2xl font-semibold text-gray-200 mb-6 text-center">
          Register
        </h2>
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-300 text-lg font-medium animate-pulse">Loading...</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-6">
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
              Register
            </button>
            {/* Optional: Add social login */}
            {/* <div className="text-center text-gray-400 text-sm">or</div>
            <LoginButton className="w-full bg-gray-950/50 text-white py-3 rounded-lg hover:bg-gray-950/80 hover:scale-105 transition-all duration-300 [box-shadow:_0_0_10px_rgba(79,70,229,0.4)]" /> */}
          </form>
        )}
      </div>
    </main>
  )
}