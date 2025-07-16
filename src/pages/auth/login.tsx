'use client'

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase-client'
import { useNavigate } from 'react-router-dom'
import { toast } from 'react-toastify'
import { Eye, EyeOff, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })
  const [resetEmail, setResetEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const validateForm = () => {
    if (!formData.email.trim()) {
      setError('Email is required')
      return false
    }

    if (!/^\S+@\S+\.\S+$/.test(formData.email)) {
      setError('Please enter a valid email address')
      return false
    }

    if (!showReset && !formData.password) {
      setError('Password is required')
      return false
    }

    setError(null)
    return true
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setIsLoading(true)

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) throw error

      toast.success('Login successful!')
      navigate('/main')
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!resetEmail.trim()) {
      setError('Email is required')
      return
    }
    
    if (!/^\S+@\S+\.\S+$/.test(resetEmail)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (error) throw error

      toast.success('Password reset link sent! Please check your email.')
      setShowReset(false)
      setResetEmail('')
    } catch (err: any) {
      setError(err.message)
      toast.error(err.message || 'Failed to send reset link')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gray-100 dark:bg-gray-900 p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-8 shadow-lg">
        <div className="flex items-center mb-6">
          {showReset && (
            <button
              onClick={() => setShowReset(false)}
              className="mr-2 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
          )}
          <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200">
            {showReset ? 'Reset Password' : 'Welcome Back'}
          </h2>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">
              {showReset ? 'Sending reset link...' : 'Signing in...'}
            </p>
          </div>
        ) : !showReset ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                name="email"
                placeholder="you@example.com"
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={formData.email}
                onChange={handleChange}
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="••••••••"
                  className="w-full p-3 pr-10 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  value={formData.password}
                  onChange={handleChange}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm tracking-wide ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              Sign In
            </button>
            
            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setShowReset(true)}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline focus:outline-none"
                disabled={isLoading}
              >
                Forgot password?
              </button>
              
              <button
                type="button"
                onClick={() => navigate('/register')}
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline focus:outline-none"
                disabled={isLoading}
              >
                Don't have an account? Sign up
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            <p className="text-gray-600 dark:text-gray-400 text-sm mb-4">
              Enter your email address and we'll send you a link to reset your password.
            </p>
            
            <div>
              <label htmlFor="resetEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Email Address
              </label>
              <input
                type="email"
                id="resetEmail"
                placeholder="you@example.com"
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                disabled={isLoading}
              />
            </div>
            
            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                {error}
              </div>
            )}
            
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all font-semibold text-sm tracking-wide ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              Send Reset Link
            </button>
          </form>
        )}
      </div>
    </main>
  )
}