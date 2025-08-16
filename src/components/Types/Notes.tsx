import { useEffect, useState } from "react";
import { supabase } from "../../lib/supabase-client";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useNavigate } from "react-router-dom";
import Editor from "../Editor";
import { encrypt, decrypt } from "../../lib/crypto-helper";
import SubSidebar from "../SubSidebar";

type NotesProps = {
  roomId?: string | null;
};

export default function Notes({ roomId }: NotesProps) {
  console.log("Room Id Notes: ", roomId);
  
  const user = useAuthUser();
  const navigate = useNavigate();
  const [files, setFiles] = useState<{ [key: string]: string }>({});
  const [currentFile, setCurrentFile] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  // Fetch notes
 useEffect(() => {
  if (user === undefined) return;
  if (!user) {
    navigate("/login");
    return;
  }

  (async () => {
    const secretKey = roomId ?? user.id;

    // CHANGED: avoid `.or(...)` because it returns notes outside the intended scope.
    // Instead, explicitly AND the conditions.
    let query = supabase
      .from("notes")
      .select("title, ciphertext, iv, salt");

    if (roomId) {
      // Only notes for this room
      query = query.eq("room_id", roomId);
    } else {
      // Only personal notes: owned by user AND room_id IS NULL
      query = query.eq("user_id", user.id).is("room_id", null);
    }

    const { data: supabaseData, error } = await query;

    if (error) {
      console.error("Failed to fetch Supabase notes", error);
      setFiles({});
      return;
    }

    const supabaseNotes: { [key: string]: string } = {};
    for (const note of supabaseData ?? []) {
      const { title, ciphertext, iv, salt } = note as {
        title: string;
        ciphertext: string | null;
        iv: string | null;
        salt: string | null;
      };

      try {
        if (ciphertext && iv && salt) {
          const content = await decrypt({ ciphertext, iv, salt }, secretKey);
          supabaseNotes[title] = content;
        } else {
          supabaseNotes[title] = "";
        }
      } catch (err) {
        console.error(`Failed to decrypt note "${title}":`, err);
        supabaseNotes[title] = "[Decryption failed]";
      }
    }

    setFiles(supabaseNotes);

    if (!currentFile || !(currentFile in supabaseNotes)) {
      const firstFile = Object.keys(supabaseNotes)[0];
      if (firstFile) {
        setCurrentFile(firstFile);
        setText(supabaseNotes[firstFile]);
      }
    }
  })();
}, [user, navigate, roomId]);

  useEffect(() => {
    if (!currentFile || !user) return;

    const timeout = setTimeout(async () => {
      const secretKey = roomId ?? user.id;

      const encrypted = await encrypt(text, secretKey);

      const { error } = await supabase
        .from("notes")
        .upsert(
          {
            user_id: user.id,
            title: currentFile,
            ciphertext: encrypted.ciphertext,
            iv: encrypted.iv,
            salt: encrypted.salt,
            room_id: roomId ?? null,
          },
          {
            onConflict: roomId ? "user_id,title,room_id" : "user_id,title",
          }
        );

      if (error) console.error("Sync failed:", error.message);
    }, 500);

    return () => clearTimeout(timeout);
  }, [text, currentFile, user, roomId]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-700">
        <p className="text-gray-300 text-base sm:text-lg font-medium animate-pulse">Loading...</p>
      </div>
    );
  }

  const handleFileSelect = (file: string) => {
    setCurrentFile(file);
    setText(files[file]);
  };

  const handleNewFile = async () => {
    if (!user) return;

    const name = prompt("Enter a name for your note:");
    if (!name) return;
    if (files[name]) {
      alert(`Note with title ${name} already exists!`);
      return;
    }

    setFiles((prev) => ({ ...prev, [name]: "" }));
    setCurrentFile(name);
    setText("");

    await supabase.from("notes").insert({
      user_id: user.id,
      title: name,
      content: "",
      room_id: roomId ?? null,
    });
  };

  const handleDelete = async (file: string) => {
    if (!user || !confirm(`Delete "${file}"?`)) return;

    const deleteQuery = supabase
      .from("notes")
      .delete()
      .eq("user_id", user.id)
      .eq("title", file);
    
    if (roomId) {
      deleteQuery.eq("room_id", roomId); // delete room note only
    } else {
      deleteQuery.is("room_id", null); // delete personal vault note only
    }
    
    const { error } = await deleteQuery;

    if (error) {
      alert(`Failed to delete note "${file}": ${error.message}`);
      return;
    }

    const updated = { ...files };
    delete updated[file];

    setFiles(updated);

    if (file === currentFile) {
      const next = Object.keys(updated)[0] || "";
      setCurrentFile(next);
      setText(updated[next] || "");
    }
  };

  const handleRename = async (file: string) => {
    if (!user) return;
    const newName = prompt("Enter new title:", file);
    if (!newName || newName === file) return;
    if (files[newName]) {
      alert(`Note with title ${newName} already exists!`);
      return;
    }

    const updateQuery = supabase
      .from("notes")
      .update({ title: newName })
      .eq("user_id", user.id)
      .eq("title", file); 

    if (roomId) {
      updateQuery.eq("room_id", roomId);
    } else {
      updateQuery.is("room_id", null); 
    }

    const { error } = await updateQuery;

    if (error) {
      alert(`Failed to rename note "${file}": ${error.message}`);
      return;
    }

    setFiles((prev) => {
      const updated: { [key: string]: string } = {};
      Object.keys(prev).forEach((key) => {
        updated[key === file ? newName : key] = prev[key];
      });
      return updated;
    });

    if (file === currentFile) setCurrentFile(newName);
  };

  const filteredFiles = Object.keys(files)
    .filter((file) => file.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-700 rounded-lg shadow-md overflow-hidden transition-all duration-300">
      {/* Collapsible Sidebar */}
      <SubSidebar
        search={search}
        setSearch={setSearch}
        items={filteredFiles}
        onCreate={handleNewFile}
        onSelect={handleFileSelect}
        onRename={handleRename}
        onDelete={handleDelete}
        currentItem={currentFile}
        typeLabel="Note"
      />

      {/* Editor Area */}
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-gray-700 transition-all duration-300">
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-200 mb-4 sm:mb-6">
          {currentFile || "No Note Selected"}
        </h2>

        {currentFile ? (
          <div className="flex-1 bg-gray-800 border border-gray-600 rounded-lg shadow-sm p-3 sm:p-4">
            <Editor content={text} onUpdate={setText} key={currentFile} />
          </div>
        ) : (
          <p className="text-gray-400 italic text-sm sm:text-base">
            Select or create a note to begin editing.
          </p>
        )}
      </div>
    </div>
  );
}