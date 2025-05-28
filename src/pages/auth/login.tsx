'use client'

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase-client'
import { useNavigate } from 'react-router-dom'
import {toast} from 'react-toastify';

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')

  //main function to handle login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    //actual supabase function to handle login
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      toast.error(error.message)
    } else {
      toast.success('Login successful!')
      navigate('/main');
    }
  }

  //function to handle forgot password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()

    //actual one for reset password
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: 'http://localhost:3000/reset-password', 
    })

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
    <main className="min-h-screen bg-black p-8 flex items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.2)_0%,_rgba(0,0,0,1)_70%)]">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-950 to-black border-2 border-indigo-500/50 rounded-xl p-8 shadow-[0_0_20px_rgba(79,70,229,0.4)] animate-[glitch-slide_0.8s_ease-out]">
        <h2 className="text-4xl font-extrabold text-white mb-6 text-center animate-[glitch_1.5s_ease-in-out] [text-shadow:_0_0_12px_rgba(79,70,229,0.8)]">
          {showReset ? 'Reset Password' : 'Login'}
        </h2>
        {!showReset ? (
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 bg-gray-950/50 text-white border border-indigo-500/30 rounded-lg focus:outline-none focus:border-indigo-500/80 focus:shadow-[0_0_10px_rgba(79,70,229,0.5)] transition-all duration-300 [text-shadow:_0_0_4px_rgba(45,212,191,0.3)]"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 bg-gray-950/50 text-white border border-indigo-500/30 rounded-lg focus:outline-none focus:border-indigo-500/80 focus:shadow-[0_0_10px_rgba(79,70,229,0.5)] transition-all duration-300 [text-shadow:_0_0_4px_rgba(45,212,191,0.3)]"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center [text-shadow:_0_0_5px_rgba(239,68,68,0.5)]">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-500/60 text-white py-3 rounded-lg hover:bg-indigo-500/90 hover:scale-105 transition-all duration-300 [box-shadow:_0_0_15px_rgba(79,70,229,0.6)]"
            >
              Login
            </button>
            <p
              className="text-sm text-teal-400 hover:text-teal-300 underline cursor-pointer text-center transition-colors duration-300 [text-shadow:_0_0_4px_rgba(45,212,191,0.3)]"
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
                className="w-full p-3 bg-gray-950/50 text-white border border-indigo-500/30 rounded-lg focus:outline-none focus:border-indigo-500/80 focus:shadow-[0_0_10px_rgba(79,70,229,0.5)] transition-all duration-300 [text-shadow:_0_0_4px_rgba(45,212,191,0.3)]"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
            {error && (
              <p className="text-red-400 text-sm text-center [text-shadow:_0_0_5px_rgba(239,68,68,0.5)]">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full bg-indigo-500/60 text-white py-3 rounded-lg hover:bg-indigo-500/90 hover:scale-105 transition-all duration-300 [box-shadow:_0_0_15px_rgba(79,70,229,0.6)]"
            >
              Send Reset Link
            </button>
            <p
              className="text-sm text-teal-400 hover:text-teal-300 underline cursor-pointer text-center transition-colors duration-300 [text-shadow:_0_0_4px_rgba(45,212,191,0.3)]"
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