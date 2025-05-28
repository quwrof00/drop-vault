import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase-client";
import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

export function Navbar() {
  const location = useLocation();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user);
    };

    fetchUser();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const navigate = useNavigate();
  
  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error.message);
    }
    setUser(null);
    navigate('/login');
  }

  return (
    <nav className="bg-gray-900 border-b-2 border-orange-700 p-4 flex justify-between items-center sticky top-0 z-50 rounded-b">
      <div className="flex items-center gap-4">
      <button 
        onClick={() => navigate('/')} 
        className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300 hover:from-blue-300 hover:to-blue-200 transition-all"
      >
        DropVault
      </button>
      {user ? <button 
              onClick={() => navigate('/main')}
              className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
            >
             Home
            </button>: ""}
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
          
            <button 
              onClick={() => navigate('/dashboard')}
              className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
            >
              User Dashboard
            </button>
            <button 
              onClick={handleSignOut} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-md hover:shadow-blue-500/20"
            >
              Sign Out
            </button>
          </>
        ) : (
          <div className="flex gap-3">
            <button 
              onClick={() => navigate('/login')} 
              className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
            >
              Login
            </button>
            <button 
              onClick={() => navigate('/register')} 
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-md hover:shadow-blue-500/20"
            >
              Sign Up
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}