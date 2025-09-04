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
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isCreating, setIsCreating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch notes
  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const secretKey = roomId ?? user.id;

        let query = supabase
  .from("notes")
  .select("title, ciphertext, iv, salt, updated_at");

if (roomId) {
  // Only notes for this room
  query = query.eq("room_id", roomId);
} else {
  // Only personal notes: owned by user AND room_id IS NULL
  query = query.eq("user_id", user.id).is("room_id", null);
}

// Order by most recently updated
query = query.order("updated_at", { ascending: false });

const { data: supabaseData, error } = await query;


        if (error) {
          console.error("Failed to fetch Supabase notes", error);
          setError("Failed to load notes. Please try again.");
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
      } catch (err) {
        console.error("Error loading notes:", err);
        setError("An unexpected error occurred while loading notes.");
      } finally {
        setIsLoading(false);
      }
    })();
  }, [user, navigate, roomId]);

  // Auto-save notes
  useEffect(() => {
    if (!currentFile || !user) return;

    const timeout = setTimeout(async () => {
      setIsSaving(true);
      try {
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

        if (error) {
          console.error("Sync failed:", error.message);
          setError("Failed to save note. Changes may be lost.");
        }
      } catch (err) {
        console.error("Save error:", err);
        setError("Failed to save note. Changes may be lost.");
      } finally {
        setIsSaving(false);
      }
    }, 500);

    return () => clearTimeout(timeout);
  }, [text, currentFile, user, roomId]);

  if (user === undefined || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-700">
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            <div className="w-12 h-12 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-12 h-12 border-4 border-transparent border-r-blue-400 rounded-full animate-ping"></div>
          </div>
          <p className="text-gray-300 text-base sm:text-lg font-medium">
            {user === undefined ? "Loading..." : "Decrypting your notes..."}
          </p>
        </div>
      </div>
    );
  }

  const handleFileSelect = (file: string) => {
    setCurrentFile(file);
    setText(files[file]);
    setError(null);
  };

  const handleNewFile = async () => {
    if (!user) return;

    const name = prompt("Enter a name for your note:");
    if (!name || !name.trim()) return;
    
    const trimmedName = name.trim();
    if (files[trimmedName]) {
      alert(`Note with title "${trimmedName}" already exists!`);
      return;
    }

    setIsCreating(true);
    try {
      // Fixed: Remove the content field and add proper encrypted data
      const secretKey = roomId ?? user.id;
      const encrypted = await encrypt("", secretKey);

      const { error } = await supabase.from("notes").insert({
        user_id: user.id,
        title: trimmedName,
        ciphertext: encrypted.ciphertext,
        iv: encrypted.iv,
        salt: encrypted.salt,
        room_id: roomId ?? null,
      });

      if (error) {
        console.error("Failed to create note:", error);
        alert(`Failed to create note: ${error.message}`);
        return;
      }

      setFiles((prev) => ({ ...prev, [trimmedName]: "" }));
      setCurrentFile(trimmedName);
      setText("");
      setError(null);
    } catch (err) {
      console.error("Error creating note:", err);
      alert("Failed to create note. Please try again.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (file: string) => {
    if (!user || !confirm(`Delete "${file}"?`)) return;

    const deleteQuery = supabase
      .from("notes")
      .delete()
      .eq("user_id", user.id)
      .eq("title", file);
    
    if (roomId) {
      deleteQuery.eq("room_id", roomId);
    } else {
      deleteQuery.is("room_id", null);
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
    setError(null);
  };

  const handleRename = async (file: string) => {
    if (!user) return;
    const newName = prompt("Enter new title:", file);
    if (!newName || !newName.trim() || newName.trim() === file) return;
    
    const trimmedName = newName.trim();
    if (files[trimmedName]) {
      alert(`Note with title "${trimmedName}" already exists!`);
      return;
    }

    const updateQuery = supabase
      .from("notes")
      .update({ title: trimmedName })
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
        updated[key === file ? trimmedName : key] = prev[key];
      });
      return updated;
    });

    if (file === currentFile) setCurrentFile(trimmedName);
    setError(null);
  };

  const filteredFiles = Object.keys(files)
    .filter((file) => file.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-700 rounded-lg shadow-lg overflow-hidden transition-all duration-300">
      {/* Error Banner */}
      {error && (
        <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-50 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 animate-slideDown">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          <span className="text-sm">{error}</span>
          <button 
            onClick={() => setError(null)}
            className="ml-2 text-red-200 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
      )}

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
        isCreating={isCreating}
      />

      {/* Editor Area */}
      <div className="flex-1 flex flex-col p-4 sm:p-6 lg:p-8 overflow-hidden bg-gray-700 transition-all duration-300">
        {/* Header with save indicator */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-200 flex items-center space-x-3">
            <span>{currentFile || "No Note Selected"}</span>
            {isSaving && (
              <div className="flex items-center space-x-2 text-blue-400">
                <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm font-normal">Saving...</span>
              </div>
            )}
          </h2>
          
          {/* Room indicator */}
          {roomId && (
            <div className="bg-blue-600/20 text-blue-300 px-3 py-1 rounded-full text-sm font-medium border border-blue-600/30">
              Room Notes
            </div>
          )}
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex flex-col min-h-0">
          {currentFile ? (
            <div className="flex-1 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl shadow-lg p-3 sm:p-4 overflow-auto">
              <Editor content={text} onUpdate={setText} key={currentFile} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-16 h-16 mx-auto bg-gray-600/30 rounded-full flex items-center justify-center">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-gray-300 font-medium text-base sm:text-lg mb-2">
                    No note selected
                  </p>
                  <p className="text-gray-400 text-sm">
                    Select an existing note or create a new one to start writing
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
