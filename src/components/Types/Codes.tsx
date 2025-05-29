import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, set } from "idb-keyval";
import { useAuthUser } from "../../hooks/useAuthUser";
import { supabase } from "../../lib/supabase-client";
import Compiler from "../Compiler";
import CodeEditor from "@uiw/react-textarea-code-editor";

const getSnippetsKey = (userId: string) => `my_code_snippets_${userId}`;

const languages = [
  { label: "C", value: "c" },
  { label: "C++", value: "cpp" },
  { label: "Java", value: "java" },
  { label: "JavaScript", value: "javascript" },
  { label: "Python", value: "python" },
];

type Snippet = {
  code: string;
  language: string;
};

export default function Codes() {
  const user = useAuthUser();
  const navigate = useNavigate();

  const [snippets, setSnippets] = useState<{ [title: string]: Snippet }>({});
  const [currentTitle, setCurrentTitle] = useState("");
  const [search, setSearch] = useState("");

  // Load snippets from IDB + Supabase when user changes
  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      const SNIPPETS_KEY = getSnippetsKey(user.id);
      const localSnippets = (await get(SNIPPETS_KEY)) || {};

      const { data, error } = await supabase
        .from("codes")
        .select("title, code, language")
        .eq("user_id", user.id);

      if (data && !error) {
        const supabaseSnippets: { [key: string]: Snippet } = {};
        data.forEach(({ title, code, language }) => {
          supabaseSnippets[title] = {
            code: code || "",
            language: language || "javascript",
          };
        });

        const merged = { ...supabaseSnippets, ...localSnippets };

        setSnippets(merged);
        await set(SNIPPETS_KEY, merged);

        const first = Object.keys(merged)[0];
        if (first) {
          setCurrentTitle(first);
        }
      }
    })();
  }, [user, navigate]);

  // Save changes to IDB + Supabase after snippet code or language changes, debounced
  useEffect(() => {
    if (!currentTitle || !user) return;

    const timeout = setTimeout(async () => {
      const SNIPPETS_KEY = getSnippetsKey(user.id);
      const updated = { ...snippets };

      await set(SNIPPETS_KEY, updated);

      const snippetToSave = updated[currentTitle];
      if (!snippetToSave) return;

      const { error } = await supabase
        .from("codes")
        .upsert(
          {
            user_id: user.id,
            title: currentTitle,
            code: snippetToSave.code,
            language: snippetToSave.language,
          },
          { onConflict: "user_id,title" }
        );

      if (error) console.error("Sync failed:", error.message);
    }, 500);

    return () => clearTimeout(timeout);
  }, [snippets, currentTitle, user]);

  const handleNewSnippet = async () => {
    if (!user) return;
    const title = prompt("Enter a title for your snippet:");
    if (!title || snippets[title]) return;

    const updated = {
      ...snippets,
      [title]: { code: "", language: "javascript" },
    };
    setSnippets(updated);
    setCurrentTitle(title);

    const SNIPPETS_KEY = getSnippetsKey(user.id);
    await set(SNIPPETS_KEY, updated);

    const { error } = await supabase.from("codes").insert({
      user_id: user.id,
      title,
      code: "",
      language: "javascript",
    });
    if (error) console.error("Failed to insert new snippet:", error.message);
  };

  const handleSelect = (title: string) => {
    setCurrentTitle(title);
  };

  const handleDelete = async (title: string) => {
    if (!user || !confirm(`Delete "${title}"?`)) return;

    const updated = { ...snippets };
    delete updated[title];
    setSnippets(updated);
    await set(getSnippetsKey(user.id), updated);

    await supabase
      .from("codes")
      .delete()
      .eq("user_id", user.id)
      .eq("title", title);

    if (title === currentTitle) {
      const next = Object.keys(updated)[0] || "";
      setCurrentTitle(next);
    }
  };

  const handleRename = async (title: string) => {
    if (!user) return;
    const newTitle = prompt("Enter new title:", title);
    if (!newTitle || newTitle === title) return;
    if (snippets[newTitle]) {
      alert(`Code with title ${newTitle} already exists!`);
      return;
    }

    const updated: { [key: string]: Snippet } = {};
    Object.keys(snippets).forEach((key) => {
      updated[key === title ? newTitle : key] = snippets[key];
    });

    setSnippets(updated);
    await set(getSnippetsKey(user.id), updated);

    await supabase
      .from("codes")
      .update({ title: newTitle })
      .eq("user_id", user.id)
      .eq("title", title);

    if (title === currentTitle) setCurrentTitle(newTitle);
  };

  const handleLanguageChange = (language: string) => {
    if (!currentTitle) return;
    setSnippets({
      ...snippets,
      [currentTitle]: {
        ...snippets[currentTitle],
        language,
      },
    });
  };

  const handleCodeChange = async (title: string, code: string) => {
    if (!currentTitle) return;
    setSnippets({
      ...snippets,
      [currentTitle]: {
        ...snippets[currentTitle],
        code,
      },
    });
    const {error: codeChangeError} = await supabase
    .from("codes")
    .update({code: code})
    .eq("user_id", user?.id)
    .eq("title", title)
  };

  const filteredSnippets = Object.keys(snippets)
    .filter((title) => title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return (
    <div className="flex h-[calc(100vh-4rem)] bg-white rounded-lg shadow-sm">
      {/* Sidebar */}
      <div className="w-full sm:w-1/4 p-4 space-y-4 bg-gray-50 border-r border-gray-200">
        <div className="flex flex-col gap-3">
          <input
            type="text"
            placeholder="Search snippets..."
            className="p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={handleNewSnippet}
            className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors font-semibold"
          >
            + New Snippet
          </button>
        </div>
        {filteredSnippets.length === 0 && (
          <p className="text-center text-gray-500">No snippets found. Create one!</p>
        )}
        <div className="space-y-2">
          {filteredSnippets.map((title) => (
            <div
              key={title}
              className="flex items-center justify-between p-2 rounded-md hover:bg-gray-100 transition-colors"
            >
              <span
                onClick={() => handleSelect(title)}
                className={`flex-1 cursor-pointer truncate text-gray-800 font-medium ${
                  title === currentTitle ? "bg-blue-100 text-blue-800" : ""
                }`}
              >
                {title}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => handleRename(title)}
                  className="text-yellow-600 hover:text-yellow-800"
                  title="Rename snippet"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(title)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete snippet"
                >
                  ❌
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="w-full sm:w-3/4 p-6 flex flex-col">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-800 truncate">
            {currentTitle || "No Snippet Selected"}
          </h2>
          <select
            className="border border-gray-300 rounded-md p-1 text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={!currentTitle}
            value={currentTitle ? snippets[currentTitle]?.language : "javascript"}
            onChange={(e) => handleLanguageChange(e.target.value)}
          >
            {languages.map(({ label, value }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {currentTitle && (
          <>
            <CodeEditor
  language={snippets[currentTitle].language}
  value={snippets[currentTitle].code}
  onChange={(e) => handleCodeChange(currentTitle, e.target.value)}
  padding={15}
  style={{
    fontSize: 14,
    backgroundColor: "#1e1e1e",  // Dark background
    color: "#d4d4d4",            // Light text color
    fontFamily:
      "ui-monospace, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace",
    flex: 1,
    borderRadius: "6px",
    border: "1px solid #333",    // Darker border
    resize: "vertical",
    minHeight: "300px",
  }}
/>

            <div className="mt-4 flex-grow">
              <Compiler
                language={snippets[currentTitle].language}
                code={snippets[currentTitle].code}
              />
            </div>
          </>
        )}

        {!currentTitle && (
          <p className="text-center text-gray-500 mt-10">
            Select or create a snippet to start coding.
          </p>
        )}
      </div>
    </div>
  );
}
