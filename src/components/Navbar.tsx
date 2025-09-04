import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase-client";
import { useAuthUser } from "../hooks/useAuthUser";
import { CreateRoomForm, type RoomFormData } from "./CreateRoomForm";
import { useState } from "react";

export function Navbar() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [createRoom, setCreateRoom] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [isCreatingRoom, setIsCreatingRoom] = useState(false);
  const [isJoiningRoom, setIsJoiningRoom] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleSignOut() {
    setIsSigningOut(true);
    setError(null);
    
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error("Sign out error:", error.message);
        setError("Failed to sign out. Please try again.");
      } else {
        navigate("/login");
      }
    } catch (err) {
      console.error("Unexpected sign out error:", err);
      setError("An unexpected error occurred during sign out.");
    } finally {
      setIsSigningOut(false);
    }
  }

  async function handleRoomCreate(data: RoomFormData) {
    if (!user) {
      console.error("User not logged in");
      setError("You must be logged in to create a room.");
      return;
    }

    setIsCreatingRoom(true);
    setError(null);

    try {
      // Validate input data
      if (!data.name?.trim() || !data.code?.trim()) {
        setError("Room name and code are required.");
        return;
      }

      // Check if room code already exists
      const { data: existingRoom } = await supabase
        .from("rooms")
        .select("code")
        .eq("code", data.code.trim())
        .maybeSingle();

      if (existingRoom) {
        setError("A room with this code already exists. Please choose a different code.");
        return;
      }

      const { error: roomError, data: room } = await supabase
        .from("rooms")
        .insert([
          {
            name: data.name.trim(),
            code: data.code.trim(),
            created_by: user.id,
          },
        ])
        .select()
        .single();

      if (roomError || !room) {
        console.error("Error creating room:", roomError?.message);
        setError(`Failed to create room: ${roomError?.message || "Unknown error"}`);
        return;
      }

      const { error: userAddError } = await supabase.from("room_users").insert({
        room_id: room.id,
        user_id: user.id,
      });

      if (userAddError) {
        console.error("Error adding user to room:", userAddError.message);
        setError("Room created but failed to add you to it. Please try joining manually.");
        return;
      }

      console.log("Room created and user added:", room);
      setSuccess(`Room "${data.name}" created successfully!`);
      setCreateRoom(false);
      
      // Auto-clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error("Unexpected error creating room:", err);
      setError("An unexpected error occurred while creating the room.");
    } finally {
      setIsCreatingRoom(false);
    }
  }

  async function handleJoinRoom() {
    if (!user) {
      setError("You must be logged in to join a room.");
      return;
    }

    const code = prompt("Enter room code (case-sensitive):");
    if (!code?.trim()) return;

    const trimmedCode = code.trim();
    setIsJoiningRoom(true);
    setError(null);

    try {
      console.log("Entered code:", JSON.stringify(trimmedCode));
      console.log(
        "Entered code char codes:",
        Array.from(trimmedCode).map((c: string) => c.charCodeAt(0))
      );

      // Fetch a single room by code (case-sensitive)
      const { data: matchingRoom, error } = await supabase
        .from("rooms")
        .select("id, code, name")
        .eq("code", trimmedCode)
        .maybeSingle();

      if (error) {
        console.error("Error finding room:", error.message);
        setError("Error searching for room. Please try again.");
        return;
      }

      if (!matchingRoom) {
        setError("Room not found. Please check the code and try again (case-sensitive).");
        return;
      }

      console.log(
        `Found room: ID=${matchingRoom.id}, Code="${matchingRoom.code}", Name="${matchingRoom.name}"`
      );

      // Check if user already in the room
      const { data: existing, error: existingError } = await supabase
        .from("room_users")
        .select("*")
        .eq("room_id", matchingRoom.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (existingError) {
        console.error("Error checking room membership:", existingError.message);
        setError("Error checking room membership. Please try again.");
        return;
      }

      if (existing) {
        setSuccess(`You're already a member of "${matchingRoom.name}"!`);
        setTimeout(() => setSuccess(null), 3000);
        return;
      }

      const { error: joinError } = await supabase.from("room_users").insert({
        room_id: matchingRoom.id,
        user_id: user.id,
      });

      if (joinError) {
        console.error("Error joining room:", joinError.message);
        setError("Could not join room. Please try again.");
        return;
      }

      setSuccess(`Successfully joined "${matchingRoom.name}"!`);
      setTimeout(() => {
        setSuccess(null);
        window.location.reload();
      }, 2000);
    } catch (err) {
      console.error("Unexpected error joining room:", err);
      setError("An unexpected error occurred while joining the room.");
    } finally {
      setIsJoiningRoom(false);
    }
  }

  // Auto-clear error messages after 5 seconds
  useState(() => {
    if (error) {
      const timeout = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timeout);
    }
  });

  return (
    <>
      {/* Success/Error Messages */}
      {(success || error) && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-slideDown">
          {success && (
            <div className="bg-green-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{success}</span>
              <button 
                onClick={() => setSuccess(null)}
                className="ml-2 text-green-200 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}
          {error && (
            <div className="bg-red-600 text-white px-6 py-3 rounded-lg shadow-lg flex items-center space-x-3">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium">{error}</span>
              <button 
                onClick={() => setError(null)}
                className="ml-2 text-red-200 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
          )}
        </div>
      )}

      <nav className="bg-gray-900/95 backdrop-blur-sm border-b-2 border-orange-700/80 p-4 flex justify-between items-center sticky top-0 z-40 rounded-b shadow-lg">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-blue-300 hover:from-blue-300 hover:via-purple-300 hover:to-blue-200 transition-all duration-300 hover:scale-105"
          >
            DropVault
          </button>

          {user && (
            <>
              <div className="h-6 w-px bg-gray-600 mx-2"></div>
              
              <button
                onClick={() => navigate("/main")}
                className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-gray-800/50 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Vault</span>
              </button>
              
              <button
                onClick={() => navigate("/rooms")}
                className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-gray-800/50 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Rooms</span>
              </button>
              
              <div className="h-6 w-px bg-gray-600 mx-2"></div>
              
              <button
                onClick={() => setCreateRoom(true)}
                disabled={isCreatingRoom}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 disabled:cursor-not-allowed text-white px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 shadow-sm hover:shadow-green-500/20 flex items-center space-x-2"
              >
                {isCreatingRoom ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span>Create Room</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleJoinRoom}
                disabled={isJoiningRoom}
                className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 disabled:cursor-not-allowed text-white px-3 py-2 text-sm font-medium rounded-md transition-all duration-200 shadow-sm hover:shadow-purple-500/20 flex items-center space-x-2"
              >
                {isJoiningRoom ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                    <span>Join Room</span>
                  </>
                )}
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button
                onClick={() => navigate("/dashboard")}
                className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-gray-800/50 flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                <span>Dashboard</span>
              </button>
              
              <div className="h-6 w-px bg-gray-600"></div>
              
              <button
                onClick={handleSignOut}
                disabled={isSigningOut}
                className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-md hover:shadow-blue-500/20 flex items-center space-x-2"
              >
                {isSigningOut ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Signing Out...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    <span>Sign Out</span>
                  </>
                )}
              </button>
            </>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => navigate("/login")}
                className="text-gray-300 hover:text-white px-3 py-2 text-sm font-medium transition-colors rounded-md hover:bg-gray-800/50"
              >
                Login
              </button>
              <button
                onClick={() => navigate("/register")}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-md hover:shadow-blue-500/20"
              >
                Sign Up
              </button>
            </div>
          )}
        </div>
      </nav>

      {createRoom && (
        <CreateRoomForm
          onClose={() => setCreateRoom(false)}
          onCreate={handleRoomCreate}
          isCreating={isCreatingRoom}
        />
      )}
    </>
  );
}

