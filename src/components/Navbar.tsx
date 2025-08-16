import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase-client";
import { useAuthUser } from "../hooks/useAuthUser";
import { CreateRoomForm, type RoomFormData } from "./CreateRoomForm";
import { useState } from "react";

export function Navbar() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [createRoom, setCreateRoom] = useState(false);

  async function handleSignOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("Sign out error:", error.message);
    } else {
      navigate("/login");
    }
  }

  async function handleRoomCreate(data: RoomFormData) {
    if (!user) {
      console.error("User not logged in");
      return;
    }

    const { error: roomError, data: room } = await supabase
      .from("rooms")
      .insert([
        {
          name: data.name,
          code: data.code,
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (roomError || !room) {
      console.error("Error creating room:", roomError?.message);
      return;
    }

    const { error: userAddError } = await supabase.from("room_users").insert({
      room_id: room.id,
      user_id: user.id,
    });

    if (userAddError) {
      console.error("Error adding user to room:", userAddError.message);
      return;
    }

    console.log("Room created and user added:", room);
    setCreateRoom(false);
  }

  async function handleJoinRoom() {
  const code = prompt("Enter room code (case-sensitive):");
  if (code == null || !user) return;

  console.log("Entered code:", JSON.stringify(code));
  console.log(
    "Entered code char codes:",
    Array.from(code as string).map((c: string) => c.charCodeAt(0))
  );

  // 🔎 Fetch a single room by code (case-sensitive)
  const { data: matchingRoom, error } = await supabase
    .from("rooms")
    .select("id, code")
    .eq("code", code)
    .maybeSingle(); // return null if not found

  if (error) {
    console.error("Error finding room:", error.message);
    return;
  }

  if (!matchingRoom) {
    alert("Room not found or invalid code (case-sensitive).");
    return;
  }

  console.log(
    `Found room: ID=${matchingRoom.id}, Code="${matchingRoom.code}"`
  );

  // ✅ Check if user already in the room
  const { data: existing } = await supabase
    .from("room_users")
    .select("*")
    .eq("room_id", matchingRoom.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: joinError } = await supabase.from("room_users").insert({
      room_id: matchingRoom.id,
      user_id: user.id,
    });

    if (joinError) {
      console.error("Error joining room:", joinError.message);
      alert("Could not join room.");
      return;
    }
  }

  // 🔄 Reload page to reflect joined room
  window.location.reload();
}


  return (
    <>
      <nav className="bg-gray-900 border-b-2 border-orange-700 p-4 flex justify-between items-center sticky top-0 z-50 rounded-b">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-blue-300 hover:from-blue-300 hover:to-blue-200 transition-all"
          >
            DropVault
          </button>

          {user && (
            <>
              <button
                onClick={() => navigate("/main")}
                className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Vault
              </button>
              <button
                onClick={() => navigate("/rooms")}
                className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
              >
                Rooms
              </button>
              <button
                onClick={() => setCreateRoom(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 text-sm font-medium rounded-md transition-colors shadow-sm hover:shadow-green-500/20"
              >
                + Create Room
              </button>
              <button
                onClick={handleJoinRoom}
                className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 text-sm font-medium rounded-md transition-colors shadow-sm hover:shadow-purple-500/20"
              >
                Join Room
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <button
                onClick={() => navigate("/dashboard")}
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
                onClick={() => navigate("/login")}
                className="text-gray-300 hover:text-white px-3 py-1.5 text-sm font-medium transition-colors"
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
        />
      )}
    </>
  );
}
