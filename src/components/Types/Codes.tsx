import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get, set } from "idb-keyval";
import { useAuthUser } from "../../hooks/useAuthUser";
import { supabase } from "../../lib/supabase-client";
import Compiler from "../Compiler";
import CodeEditor from "@uiw/react-textarea-code-editor";
import SubSidebar from "../SubSidebar";

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

        if (!currentTitle || !merged[currentTitle]) {
          const firstTitle = Object.keys(merged)[0];
          if (firstTitle) {
            setCurrentTitle(firstTitle);
          }
        }
      }
    })();
  }, [user, navigate]);

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

  // Create updated snippets object
  const updated = { ...snippets };
  delete updated[title];

  // Optimistic UI update
  setSnippets(updated);
  if (title === currentTitle) {
    setCurrentTitle(Object.keys(updated)[0] || "");
  }

  try {
    // Update IndexedDB
    await set(getSnippetsKey(user.id), updated);
    
    // Update Supabase
    const { error } = await supabase
      .from("codes")
      .delete()
      .eq("user_id", user.id)
      .eq("title", title);

    if (error) throw error;
  } catch (error) {
    console.error("Delete failed:", error);
    // Revert on error
    setSnippets(snippets);
    if (currentTitle === "") {
      setCurrentTitle(title);
    }
  }
};

  const handleRename = async (title: string) => {
  if (!user || !title || !snippets[title]) return;

  const newTitle = prompt("Enter new title:", title);
  if (!newTitle || newTitle === title) return;
  
  if (snippets[newTitle]) {
    alert(`Snippet with title "${newTitle}" already exists!`);
    return;
  }

  // Create updated snippets object
  const updated = { ...snippets };
  updated[newTitle] = updated[title];
  delete updated[title];

  // Optimistic UI update
  setSnippets(updated);
  if (currentTitle === title) {
    setCurrentTitle(newTitle);
  }

  try {
    // Update IndexedDB
    await set(getSnippetsKey(user.id), updated);
    
    // Update Supabase
    const { error } = await supabase
      .from("codes")
      .update({ title: newTitle })
      .eq("user_id", user.id)
      .eq("title", title);

    if (error) throw error;
  } catch (error) {
    console.error("Rename failed:", error);
    // Revert on error
    setSnippets(snippets);
    if (currentTitle === newTitle) {
      setCurrentTitle(title);
    }
  }
};

useEffect(() => {
  if (currentTitle && !snippets[currentTitle]) {
    setCurrentTitle(Object.keys(snippets)[0] || "");
  }
}, [snippets, currentTitle]);

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
    const { error: codeChangeError } = await supabase
      .from("codes")
      .update({ code: code })
      .eq("user_id", user?.id)
      .eq("title", title);
    if (codeChangeError) console.log("Error while editing code: ", codeChangeError);
  };

  const filteredSnippets = Object.keys(snippets)
    .filter((title) => title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => a.localeCompare(b));

  return (
  <div className="flex h-[calc(100vh-4rem)] bg-gray-700 rounded-lg shadow-md overflow-hidden transition-all duration-300">
    {/* Collapsible Sidebar */}
    <SubSidebar
      search={search}
      setSearch={setSearch}
      items={filteredSnippets}
      onCreate={handleNewSnippet}
      onSelect={handleSelect}
      onRename={handleRename}
      onDelete={handleDelete}
      currentItem={currentTitle}
      typeLabel="Snippet"
    />

    {/* Editor Area */}
    <div className="flex-1 p-6 lg:p-8 overflow-auto bg-gray-700 transition-all duration-300">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-gray-200 truncate">
          {currentTitle || "No Snippet Selected"}
        </h2>
        <select
          className="p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
          disabled={!currentTitle}
          value={currentTitle ? snippets[currentTitle]?.language : "javascript"}
          onChange={(e) => handleLanguageChange(e.target.value)}
        >
          {languages.map(({ label, value }) => (
            <option key={value} value={value} className="bg-gray-700 text-gray-200">
              {label}
            </option>
          ))}
        </select>
      </div>

      {currentTitle ? (
        <div className="flex flex-col gap-4">
          <div className="bg-gray-800 border border-gray-600 rounded-lg shadow-sm">
            <CodeEditor
              language={snippets[currentTitle]?.language || "javascript"}
              value={snippets[currentTitle]?.code || ""}
              onChange={(e) => handleCodeChange(currentTitle, e.target.value)}
              padding={15}
              style={{
                fontSize: 14,
                backgroundColor: "#1f2937",
                color: "#e5e7eb",
                fontFamily:
                  "ui-monospace, SFMono-Regular, Consolas, Liberation Mono, Menlo, monospace",
                borderRadius: "6px",
                border: "1px solid #4b5563",
                minHeight: "300px",
                flex: 1,
              }}
            />
          </div>
          <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-600">
            <Compiler
              language={snippets[currentTitle]?.language || "javascript"}
              code={snippets[currentTitle]?.code || ""}
            />
          </div>
        </div>
      ) : (
        <p className="text-gray-400 italic text-base text-center mt-10">
          Select or create a snippet to start coding.
        </p>
      )}
    </div>
  </div>
);
}