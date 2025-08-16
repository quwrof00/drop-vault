import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase-client";
import { useAuthUser } from "../hooks/useAuthUser";
import { useNavigate } from "react-router-dom";

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

  useEffect(() => {
    if (!user) return;

    const fetchRooms = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("room_users")
        .select("rooms(id, name, created_by)")
        .eq("user_id", user.id);

      if (error) {
        console.error("Error fetching rooms:", error.message);
        setLoading(false);
        return;
      }

      const roomList: Room[] = data.flatMap((entry) => entry.rooms);

      setRooms(roomList);
      setLoading(false);
    };

    fetchRooms();
  }, [user]);

  return (
    <div className="flex-1 min-h-[calc(100vh-4rem)] bg-gray-700 shadow-md overflow-auto p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl sm:text-3xl font-semibold text-gray-200 mb-6">
          Your Rooms
        </h1>

        {loading ? (
          <p className="text-gray-300 text-base sm:text-lg font-medium animate-pulse text-center">
            Loading...
          </p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-400 text-sm sm:text-base italic text-center">
            You’re not part of any rooms yet.
          </p>
        ) : (
          <ul className="space-y-4">
            {rooms.map((room) => (
              <li
                key={room.id}
                className="bg-gray-800 p-4 rounded-lg shadow-sm hover:shadow-md hover:bg-gray-600 cursor-pointer transition-all duration-200"
                onClick={() => navigate(`/room?roomId=${room.id}`)}
              >
                <div className="font-medium text-lg text-gray-200">
                  {room.name}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}