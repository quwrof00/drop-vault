import { useEffect, useState } from "react";
import { get, set } from "idb-keyval";
import { supabase } from "../../lib/supabase-client";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useNavigate } from "react-router-dom";

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
    setFiles(localNotes);

    const { data: supabaseData, error } = await supabase
      .from("notes")
      .select("title, content")
      .eq("user_id", user.id);

    if (supabaseData && !error) {
      const supabaseNotes: { [key: string]: string } = {};
      supabaseData.forEach(({ title, content }) => {
        supabaseNotes[title] = content;
      });

      const merged = { ...supabaseNotes, ...localNotes };
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


  // Save changes to IndexedDB + Supabase after text changes
  useEffect(() => {
    if (!currentFile || !user) return;

    const timeout = setTimeout(async () => {
      const NOTES_KEY = getNotesKey(user.id);
      const updated = { ...files, [currentFile]: text };
      setFiles(updated);
      await set(NOTES_KEY, updated);

      const { error } = await supabase
        .from("notes")
        .upsert(
          {
            user_id: user.id,
            title: currentFile,
            content: text,
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
    return <p className="text-center mt-10 text-gray-500 text-lg">Loading...</p>;
  }

  const handleFileSelect = (file: string) => {
    setCurrentFile(file);
    setText(files[file]);
  };

  const handleNewFile = async () => {
    if (!user) return;
    const name = prompt("Enter a name for your note:");
    if (!name) return;
    if (files[name]){
      alert(`Note with title ${name} already exists!`);
      return;
    }

    const NOTES_KEY = getNotesKey(user.id);
    const updated = { ...files, [name]: text };
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
    <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg shadow-sm">
      {/* Notes Sidebar */}
      <div className="w-full sm:w-1/4 p-4 space-y-4 bg-gray-50 border-r border-gray-200">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Search notes..."
            className="p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={handleNewFile}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
          >
            + New Note
          </button>
        </div>
        {filteredFiles.length === 0 && (
          <p className="text-center text-gray-500">No notes found. Create one!</p>
        )}
        <div className="space-y-2">
          {filteredFiles.map((file) => (
            <div
              key={file}
              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <span
                onClick={() => handleFileSelect(file)}
                className={`flex-1 cursor-pointer truncate text-gray-800 font-medium ${
                  file === currentFile ? "bg-blue-100 text-blue-800" : ""
                }`}
              >
                {file}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRename(file)}
                  className="text-yellow-600 hover:text-yellow-800"
                  title="Rename note"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(file)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete note"
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="w-full sm:w-3/4 p-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          {currentFile || "No Note Selected"}
        </h2>
        <textarea
          className="w-full h-[calc(100%-2rem)] p-4 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400 resize-none"
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!currentFile}
          placeholder="Start typing..."
        />
      </div>
    </div>
  );
}