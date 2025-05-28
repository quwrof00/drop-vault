'use client'

import React, { useState } from 'react'
import { supabase } from '../../lib/supabase-client'
import { useNavigate } from 'react-router-dom'
import {toast} from 'react-toastify';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [Error, setError] = useState<string | null>(null)

  //main function to handle registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()

    //check for users with same email 
    const { data: existingUsers, error: userFetchError } = await supabase
      .from('users')
      .select('email')
      .eq('email', email)

    if (userFetchError) {
      toast.error('Failed to check existing users.')
      return
    }

    if (existingUsers?.length > 0) {
      toast.error('Email is already registered!')
      return
    }

    //actual signup using supabase
    const { error: signupError } = await supabase.auth.signUp({ email, password })

    if (signupError) {
      setError(signupError.message)
      toast.error(signupError.message)
    } else {
      toast.success('Registration successful! Kindly verify your email.')
      navigate('/login');
    }
  }

  return (
    <main className="min-h-screen bg-black p-8 flex items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(79,70,229,0.2)_0%,_rgba(0,0,0,1)_70%)]">
      <div className="w-full max-w-md bg-gradient-to-b from-gray-950 to-black border-2 border-indigo-500/50 rounded-xl p-8 shadow-[0_0_20px_rgba(79,70,229,0.4)] animate-[glitch-slide_0.8s_ease-out]">
        <h2 className="text-4xl font-extrabold text-white mb-6 text-center animate-[glitch_1.5s_ease-in-out] [text-shadow:_0_0_12px_rgba(79,70,229,0.8)]">
          Register
        </h2>
        <form onSubmit={handleRegister} className="space-y-6">
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
          {Error && (
            <p className="text-red-400 text-sm text-center [text-shadow:_0_0_5px_rgba(239,68,68,0.5)]">
              {Error}
            </p>
          )}
          <button
            type="submit"
            className="w-full bg-indigo-500/60 text-white py-3 rounded-lg hover:bg-indigo-500/90 hover:scale-105 transition-all duration-300 [box-shadow:_0_0_15px_rgba(79,70,229,0.6)]"
          >
            Register
          </button>

          {/* Optional: Add social login */}
          {/* <div className="text-center text-teal-400 text-sm [text-shadow:_0_0_4px_rgba(45,212,191,0.3)]">or</div>
          <LoginButton className="w-full bg-gray-950/50 text-white py-3 rounded-lg hover:bg-gray-950/80 hover:scale-105 transition-all duration-300 [box-shadow:_0_0_10px_rgba(79,70,229,0.4)]" /> */}
        </form>
      </div>
    </main>
  )
}