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
    <div className="flex h-[calc(100vh-4rem)] bg-gray-700 rounded-lg shadow-md overflow-hidden">
      {/* Sidebar */}
      <div className="w-full sm:w-80 p-6 space-y-6 bg-gray-800 border-r border-gray-600">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="Search snippets..."
            className="p-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <button
            onClick={handleNewSnippet}
            className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 ease-in-out font-semibold text-sm tracking-wide"
          >
            + New Snippet
          </button>
        </div>
        {filteredSnippets.length === 0 ? (
          <p className="text-center text-gray-400 text-sm font-medium">
            No snippets found. Create one!
          </p>
        ) : (
          <div className="space-y-1 max-h-[calc(100vh-12rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-500 scrollbar-track-gray-700">
            {filteredSnippets.map((title) => (
              <div
                key={title}
                className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-600 transition-all duration-200 ease-in-out"
              >
                <span
                  onClick={() => handleSelect(title)}
                  className={`flex-1 cursor-pointer truncate text-gray-200 text-sm font-medium ${
                    title === currentTitle ? "bg-blue-900 text-blue-300 rounded-md px-2 py-1" : ""
                  }`}
                >
                  {title}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleRename(title)}
                    className="text-yellow-500 hover:text-yellow-400 transition-colors duration-150"
                    title="Rename snippet"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(title)}
                    className="text-red-500 hover:text-red-400 transition-colors duration-150"
                    title="Delete snippet"
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
                language={snippets[currentTitle].language}
                value={snippets[currentTitle].code}
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
                language={snippets[currentTitle].language}
                code={snippets[currentTitle].code}
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