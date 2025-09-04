import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";
import { useAuthUser } from "../hooks/useAuthUser";
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify'

type Room = {
  id: string;
  name: string;
  created_by: string;
};

export default function RoomsPage() {
  const navigate = useNavigate();
  const user = useAuthUser();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRooms = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("room_users")
      .select("rooms(id, name, created_by), inserted_at")
      .eq("user_id", user.id)
      .order("inserted_at", { ascending: false });

    if (error) {
      console.error("Error fetching rooms:", error);
      setLoading(false);
      return;
    }

    const roomList: Room[] = data.flatMap((entry) => entry.rooms);
    setRooms(roomList);
    setLoading(false);
  };

  useEffect(() => {
    fetchRooms();
  }, [user]);

  const handleLeaveRoom = async (roomId: string, roomName: string) => {
    if (!user) return;

    const confirmLeave = window.confirm(
      `Are you sure you want to leave the room "${roomName}"?`
    );
    if (!confirmLeave) return;

    try {
      // Check if user is the creator of the room
      const { data: roomData, error: roomError } = await supabase
        .from("rooms")
        .select("created_by")
        .eq("id", roomId)
        .single();

      if (roomError || !roomData) {
        console.error("Error checking room creator:", roomError);
        window.alert("Could not verify room creator.");
        return;
      }

      if (roomData.created_by === user.id) {
        // Creator leaving → must delete room
        const confirmDelete = window.confirm(
          `You are the creator of "${roomName}". Leaving will delete the room for all users. Proceed?`
        );
        if (!confirmDelete) return;

        // 1. Delete room_users first
        const { error: usersError } = await supabase
          .from("room_users")
          .delete()
          .eq("room_id", roomId);

        if (usersError) {
          console.error("Error deleting room_users:", usersError);
          window.alert(`Failed to delete room users: ${usersError.message}`);
          return;
        }

        // 2. Delete the room itself
        const { error: roomDeleteError } = await supabase
          .from("rooms")
          .delete()
          .eq("id", roomId);

        if (roomDeleteError) {
          console.error("Error deleting room:", roomDeleteError);
          window.alert(`Failed to delete room: ${roomDeleteError.message}`);
          return;
        }
      } else {
        // Non-creator → just remove user from room_users
        const { error } = await supabase
          .from("room_users")
          .delete()
          .eq("user_id", user.id)
          .eq("room_id", roomId);

        if (error) {
          console.error("Error leaving room:", error);
          window.alert(`Failed to leave room: ${error.message}`);
          return;
        }
      }

      // Refresh list after success
      await fetchRooms();
      toast.success(`You have left "${roomName}".`);
    } catch (err: any) {
      console.error("Unexpected error leaving room:", err);
      window.alert(`Unexpected error: ${err.message ?? "Check console for details"}`);
    }
  };

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] bg-gray-700 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-100 mb-8 tracking-tight">
          Your Rooms
        </h1>

        {loading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-gray-200"></div>
          </div>
        ) : rooms.length === 0 ? (
          <p className="text-gray-400 text-lg italic text-center py-16">
            You’re not part of any rooms yet. Join or create one to get started!
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {rooms.map((room) => (
              <div
                key={room.id}
                className="bg-gray-800 rounded-xl shadow-lg hover:shadow-xl hover:bg-gray-600 transform hover:-translate-y-1 transition-all duration-300"
              >
                <div className="p-6 flex justify-between items-center">
                  <h2
                    className="text-xl font-semibold text-gray-100 truncate cursor-pointer"
                    onClick={() => navigate(`/room?roomId=${room.id}`)}
                  >
                    {room.name}
                  </h2>
                  <button
                    onClick={() => handleLeaveRoom(room.id, room.name)}
                    className="text-sm text-gray-400 hover:text-red-400 px-2 py-1 rounded-md hover:bg-gray-700 transition-colors duration-200"
                  >
                    Leave
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
