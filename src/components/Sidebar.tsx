import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "../lib/supabase-client";

type SidebarProps = {
  onSelect: (section: string) => void;
  activeSection?: string;
};

const Sidebar = ({ onSelect, activeSection }: SidebarProps) => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get("roomId");
  const [roomMembers, setMembers] = useState<any[]>([]);

  const sections = [
    { name: "Images", icon: "🖼️" },
    { name: "Files", icon: "📁" },
    { name: "Notes", icon: "📝" },
    { name: "Code", icon: "💻" },
  ];

  useEffect(() => {
  const fetchMembers = async () => {
    if (!roomId) return;

    // Step 1: get user_ids
    const { data: roomUsers, error: roomError } = await supabase
      .from("room_users")
      .select("user_id, room_id") // also select room_id for debugging
      .eq("room_id", roomId);

    console.log("room_users query:", { roomId, roomUsers, roomError });

    if (roomError) {
      console.error("Error fetching room members:", roomError.message);
      return;
    }

    if (!roomUsers?.length) {
      setMembers([]);
      return;
    }

    const userIds = roomUsers.map((u) => u.user_id);
    console.log("Fetched user IDs:", userIds);

    // Step 2: fetch users by IDs
    const { data: users, error: userError } = await supabase
      .from("users")
      .select("id, email")
      .in("id", userIds);

    console.log("users query:", { users, userError });

    if (userError) {
      console.error("Error fetching users:", userError.message);
    } else {
      setMembers(users || []);
    }
  };

  fetchMembers();
}, [roomId]);


  
  return (
    <div className="w-48 md:w-64 bg-gray-900 text-white h-screen p-4 flex flex-col space-y-4 pb-0">
      <h2 className="text-2xl font-bold mt-3 mb-6 flex items-center gap-2">
        <span>🧳</span> My Vault
      </h2>

      {/* Sections */}
      <nav className="space-y-2">
        {sections.map((item) => (
          <button
            key={item.name}
            onClick={() => onSelect(item.name)}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-left text-sm font-medium transition-all duration-200
              ${
                activeSection === item.name
                  ? "bg-gray-800 text-white font-semibold border-l-4 border-blue-500"
                  : "text-gray-300 hover:bg-gray-800 hover:text-white"
              }`}
          >
            <span>{item.icon}</span>
            <span>{item.name}</span>
          </button>
        ))}
      </nav>

      {/* Members list */}
      {roomMembers.length > 0 && (
        <div className="mt-6">
          <h3 className="text-sm font-semibold mb-2">Members</h3>
          <ul className="space-y-1 text-gray-300 text-sm">
            {roomMembers.map((member) => (
              <li key={member.id}>{member.email}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
