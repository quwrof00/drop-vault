import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";
import { supabase } from "../../lib/supabase-client";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useNavigate } from "react-router-dom";
import Editor from "../Editor";
import { encrypt, decrypt } from "../../lib/crypto-helper";

const getNotesKey = (userId: string) => `my_notes_files_${userId}`;

export default function Notes() {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [files, setFiles] = useState<{ [key: string]: string }>({});
  const [currentFile, setCurrentFile] = useState<string>("");
  const [text, setText] = useState<string>("");
  const [search, setSearch] = useState<string>("");

  useEffect(() => {
  if (user === undefined) return;
  if (!user) {
    navigate("/login");
    return;
  }

  (async () => {
    const NOTES_KEY = getNotesKey(user.id);
    const localNotes = (await get(NOTES_KEY)) || {};
    setFiles(localNotes); // still load local cache for speed

    const { data: supabaseData, error } = await supabase
      .from("notes")
      .select("title, ciphertext, iv, salt")
      .eq("user_id", user.id);

    const secretKey = user.id; // 🔐 replace with vault password later

    if (supabaseData && !error) {
      const supabaseNotes: { [key: string]: string } = {};

      for (const note of supabaseData) {
        const { title, ciphertext, iv, salt } = note;
        try {
          if (ciphertext && iv && salt) {
            const content = await decrypt({ ciphertext, iv, salt }, secretKey);
            supabaseNotes[title] = content;
          } else {
            supabaseNotes[title] = ""; // fallback for old empty or broken notes
          }
        } catch (err) {
          console.error(`Failed to decrypt note "${title}":`, err);
          supabaseNotes[title] = "[Decryption failed]";
        }
      }

      const merged = { ...supabaseNotes, ...localNotes }; // 🧠 prefer Supabase first
      setFiles(merged);
      await set(NOTES_KEY, merged);

      if (!currentFile || !merged[currentFile]) {
        const firstFile = Object.keys(merged)[0];
        if (firstFile) {
          setCurrentFile(firstFile);
          setText(merged[firstFile]);
        }
      }
    }
  })();
}, [user, navigate]);

  useEffect(() => {
    if (!currentFile || !user) return;

    const timeout = setTimeout(async () => {
      const NOTES_KEY = getNotesKey(user.id);
      const updated = { ...files, [currentFile]: text };
      setFiles(updated);
      await set(NOTES_KEY, updated);

      const secretKey = user.id; // later: vault password or derived
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
          },
          {
            onConflict: "user_id,title",
          }
        );

      if (error) console.error("Sync failed:", error.message);
    }, 500);

    return () => clearTimeout(timeout);
  }, [text, currentFile, user]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-700">
        <p className="text-gray-300 text-lg font-medium animate-pulse">Loading...</p>
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

    const NOTES_KEY = getNotesKey(user.id);
    const updated = { ...files, [name]: "" };
    setFiles(updated);
    setCurrentFile(name);
    setText("");
    await set(NOTES_KEY, updated);

    await supabase.from("notes").insert({
      user_id: user.id,
      title: name,
      content: "",
      
    });
  };

  const handleDelete = async (file: string) => {
    if (!user || !confirm(`Delete "${file}"?`)) return;

    const NOTES_KEY = getNotesKey(user.id);
    const updated = { ...files };
    delete updated[file];
    setFiles(updated);
    await set(NOTES_KEY, updated);

    await supabase
      .from("notes")
      .delete()
      .eq("user_id", user.id)
      .eq("title", file);

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

    const NOTES_KEY = getNotesKey(user.id);
    const updated: { [key: string]: string } = {};
    Object.keys(files).forEach((key) => {
      updated[key === file ? newName : key] = files[key];
    });

    setFiles(updated);
    await set(NOTES_KEY, updated);

    await supabase
      .from("notes")
      .update({ title: newName })
      .eq("user_id", user.id)
      .eq("title", file);

    if (file === currentFile) setCurrentFile(newName);
  };

  const filteredFiles = Object.keys(files)
    .filter((file) => file.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-gray-700 rounded-lg shadow-md overflow-hidden">
      {/* Notes Sidebar */}
      <div className="w-full sm:w-80 p-6 space-y-6 bg-gray-800 border-r border-gray-600">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search notes..."
            className="p-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={handleNewFile}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 ease-in-out font-semibold text-sm tracking-wide"
          >
            + New Note
          </button>
        </div>
        {filteredFiles.length === 0 ? (
          <p className="text-center text-gray-400 text-sm font-medium">
            No notes found. Create one!
          </p>
        ) : (
          <div className="space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
            {filteredFiles.map((file) => (
              <div
                key={file}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-600 transition-all duration-200 ease-in-out"
              >
                <span
                  onClick={() => handleFileSelect(file)}
                  className={`flex-1 cursor-pointer truncate text-gray-200 text-sm font-medium ${
                    file === currentFile ? "bg-blue-900 text-blue-300 rounded-md px-2 py-1" : ""
                  }`}
                >
                  {file}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRename(file)}
                    className="text-yellow-500 hover:text-yellow-400 transition-colors duration-150"
                    title="Rename note"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="text-red-500 hover:text-red-400 transition-colors duration-150"
                    title="Delete note"
                  >
                    ❌
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Editor Area */}
      <div className="flex-1 p-8 overflow-auto bg-gray-700">
        <h2 className="text-2xl font-semibold text-gray-200 mb-6">
          {currentFile || "No Note Selected"}
        </h2>
        {currentFile ? (
          <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-sm p-4">
            <Editor content={text} onUpdate={setText} key={currentFile} />
          </div>
        ) : (
          <p className="text-gray-400 italic text-base">
            Select or create a note to begin editing.
          </p>
        )}
      </div>
    </div>
  );
}