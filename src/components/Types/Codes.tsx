import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser } from "../../hooks/useAuthUser";
import { supabase } from "../../lib/supabase-client";
import SubSidebar from "../SubSidebar";
import CodeEditor from "@uiw/react-textarea-code-editor";
import Compiler from "../Compiler";

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

type CodesProps = {
  roomId?: string | null;
};

export default function Codes({ roomId }: CodesProps) {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [snippets, setSnippets] = useState<{ [key: string]: Snippet }>({});
  const [currentTitle, setCurrentTitle] = useState<string>("");
  const [search, setSearch] = useState<string>("");
  const [code, setCode] = useState<string>("");

  // Fetch snippets from Supabase
  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      let query = supabase
      .from("codes")
      .select("title, code, language")
      .eq("user_id", user.id);
      if (roomId) {
        query = query.eq("room_id", roomId);
      } else {
        query = query.is("room_id", null);
      }
      
      const { data: supabaseData, error } = await query;

      if (supabaseData && !error) {
        const supabaseSnippets: { [key: string]: Snippet } = {};
        for (const { title, code, language } of supabaseData) {
          supabaseSnippets[title] = {
            code: code || "",
            language: language || "javascript",
          };
        }

        setSnippets(supabaseSnippets);

        if (!currentTitle || !supabaseSnippets[currentTitle]) {
          const firstTitle = Object.keys(supabaseSnippets)[0];
          if (firstTitle) {
            setCurrentTitle(firstTitle);
            setCode(supabaseSnippets[firstTitle].code);
          }
        }
      } else {
        console.error("Failed to fetch Supabase snippets", error);
        setSnippets({});
      }
    })();
  }, [user, navigate, roomId]);

  // Sync updates to Supabase
  useEffect(() => {
    if (!currentTitle || !user) return;

    const timeout = setTimeout(async () => {
      const snippet = snippets[currentTitle];
      if (!snippet) return;

      const { error } = await supabase
        .from("codes")
        .upsert(
          {
            user_id: user.id,
            title: currentTitle,
            code: code,
            language: snippet.language,
            room_id: roomId ?? null,
          },
          {
            onConflict: roomId ? "user_id,title,room_id" : "user_id,title",
          }
        );

      if (error) console.error("Sync failed:", error.message);

      setSnippets((prev) => ({
        ...prev,
        [currentTitle]: { ...prev[currentTitle], code },
      }));
    }, 500);

    return () => clearTimeout(timeout);
  }, [code, currentTitle, user, roomId, snippets]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-700">
        <p className="text-gray-300 text-base sm:text-lg font-medium animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  const handleSelect = (title: string) => {
    setCurrentTitle(title);
    setCode(snippets[title].code);
  };

  const handleNewSnippet = async () => {
    if (!user) return;

    const title = prompt("Enter a name for your snippet:");
    if (!title) return;
    if (snippets[title]) {
      alert(`Snippet with title ${title} already exists!`);
      return;
    }

    const newSnippet = { code: "", language: "javascript" };
    setSnippets((prev) => ({ ...prev, [title]: newSnippet }));
    setCurrentTitle(title);
    setCode("");

    await supabase.from("codes").insert({
      user_id: user.id,
      title,
      code: "",
      language: "javascript",
      room_id: roomId ?? null,
    });
  };

  const handleDelete = async (title: string) => {
    if (!user || !confirm(`Delete "${title}"?`)) return;

    const deleteQuery = supabase
      .from("codes")
      .delete()
      .eq("user_id", user.id)
      .eq("title", title);

    if (roomId) {
      deleteQuery.eq("room_id", roomId);
    } else {
      deleteQuery.is("room_id", null);
    }

    const { error } = await deleteQuery;

    if (error) {
      alert(`Failed to delete snippet "${title}": ${error.message}`);
      return;
    }

    const updated = { ...snippets };
    delete updated[title];
    setSnippets(updated);

    if (title === currentTitle) {
      const next = Object.keys(updated)[0] || "";
      setCurrentTitle(next);
      setCode(updated[next]?.code || "");
    }
  };

  const handleRename = async (title: string) => {
    if (!user) return;

    const newTitle = prompt("Enter new title:", title);
    if (!newTitle || newTitle === title) return;
    if (snippets[newTitle]) {
      alert(`Snippet with title ${newTitle} already exists!`);
      return;
    }

    const updateQuery = supabase
      .from("codes")
      .update({ title: newTitle })
      .eq("user_id", user.id)
      .eq("title", title);

    if (roomId) {
      updateQuery.eq("room_id", roomId);
    } else {
      updateQuery.is("room_id", null);
    }

    const { error } = await updateQuery;

    if (error) {
      alert(`Failed to rename snippet "${title}": ${error.message}`);
      return;
    }

    setSnippets((prev) => {
      const updated: { [key: string]: Snippet } = {};
      Object.keys(prev).forEach((key) => {
        updated[key === title ? newTitle : key] = prev[key];
      });
      return updated;
    });

    if (title === currentTitle) setCurrentTitle(newTitle);
  };

  const handleLanguageChange = (language: string) => {
    if (!currentTitle) return;
    setSnippets((prev) => ({
      ...prev,
      [currentTitle]: {
        ...prev[currentTitle],
        language,
      },
    }));
  };

  const handleCodeChange = (code: string) => {
    setCode(code);
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
      <div className="flex-1 p-4 sm:p-6 lg:p-8 overflow-auto bg-gray-700 transition-all duration-300">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-200 truncate">
            {currentTitle || "No Snippet Selected"}
          </h2>
          <select
            disabled={!currentTitle}
            value={currentTitle ? snippets[currentTitle]?.language : "javascript"}
            onChange={(e) => handleLanguageChange(e.target.value)}
            className="p-2 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                padding={15}
                style={{
                  fontSize: 14,
                  backgroundColor: "#1f2937",
                  color: "#e5e7eb",
                  fontFamily: "ui-monospace, SFMono-Regular, Consolas, Menlo, monospace",
                  borderRadius: "6px",
                  border: "1px solid #4b5563",
                  minHeight: "300px",
                }}
              />
            </div>
            <div className="bg-gray-800 rounded-lg shadow-sm p-4 border border-gray-600">
              <Compiler
                language={snippets[currentTitle].language}
                code={code}
              />
            </div>
          </div>
        ) : (
          <p className="text-gray-400 italic text-sm sm:text-base text-center mt-10">
            Select or create a snippet to start coding.
          </p>
        )}
      </div>
    </div>
  );
}