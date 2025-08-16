import { supabase } from "../../lib/supabase-client";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

type FileEntry = {
  name: string;
  blob: Blob;
  uploaded: boolean;
  lastModified: number;
  progress: number;
};

type FilesProps = {
  roomId?: string | null;
};

export default function Files({ roomId }: FilesProps) {
  const user = useAuthUser();
  const navigate = useNavigate();
  const [files, setFiles] = useState<{ [key: string]: FileEntry }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>("");

  const progressIntervals = useRef<{ [key: string]: NodeJS.Timeout }>({});

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      const folderPath = roomId ? `room-${roomId}` : user.id;
      
      const { data: supabaseFiles, error } = await supabase.storage
        .from("user-files")
        .list(folderPath);

      if (error) {
        console.error("Failed to fetch Supabase files", error);
        setFiles({}); // Clear files on error
        return;
      }

      const mergedFiles: { [key: string]: FileEntry } = {};

      supabaseFiles?.forEach((file) => {
        mergedFiles[file.name] = {
          name: file.name,
          blob: new Blob(),
          uploaded: true,
          lastModified: new Date(file.updated_at || file.created_at || Date.now()).getTime(),
          progress: 100,
        };
      });

      setFiles(mergedFiles);
    })();
  }, [user, navigate, roomId]);

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)] bg-gray-700">
        <p className="text-gray-300 text-base sm:text-lg font-medium animate-pulse">Loading...</p>
      </div>
    );
  }

  const getIcon = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (!ext) return "📁";
    if (["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)) return "🖼️";
    if (["pdf", "doc", "docx", "txt", "rtf"].includes(ext)) return "📄";
    if (["zip", "rar", "7z"].includes(ext)) return "🗜️";
    if (["mp4", "mov", "avi"].includes(ext)) return "🎥";
    if (["mp3", "wav"].includes(ext)) return "🎵";
    return "📁";
  };

  const getPublicUrl = (fileName: string) => {
    if (!user) return;
    const folderPath = roomId ? `room-${roomId}` : user.id;
    const { data } = supabase.storage
      .from("user-files")
      .getPublicUrl(`${folderPath}/${fileName}`);
    return data.publicUrl;
  };

  const uploadToSupabase = async (fileEntry: FileEntry) => {
    if (!user) return;
    const folderPath = roomId ? `room-${roomId}` : user.id;
    const path = `${folderPath}/${fileEntry.name}`;

    try {
      const { error } = await supabase.storage
        .from("user-files")
        .upload(path, fileEntry.blob, { upsert: true });

      if (error) {
        alert(`Failed to upload ${fileEntry.name}: ${error.message}`);
        return;
      }

      setFiles((prev) => ({
        ...prev,
        [fileEntry.name]: { ...fileEntry, uploaded: true, progress: 100 },
      }));
    } catch (err) {
      alert(`Failed to upload ${fileEntry.name}`);
    } finally {
      if (progressIntervals.current[fileEntry.name]) {
        clearInterval(progressIntervals.current[fileEntry.name]);
        delete progressIntervals.current[fileEntry.name];
      }
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const fileName = file.name;
    if (files[fileName]) {
      alert(`File with name ${fileName} already exists!`);
      return;
    }
    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, "");

    // Allow only letters, numbers, underscores, hyphens, and spaces
    const isValidName = /^[a-zA-Z0-9 _-]+$/.test(nameWithoutExtension);

    if (!isValidName) {
      alert("File name contains special characters. Only letters, numbers, spaces, _ and - are allowed.");
      e.target.value = "";
      return;
    }

    const newEntry: FileEntry = {
      name: file.name,
      blob: file,
      uploaded: false,
      lastModified: file.lastModified,
      progress: 0,
    };

    setFiles((prev) => ({
      ...prev,
      [file.name]: newEntry,
    }));

    let progress = 0;
    progressIntervals.current[file.name] = setInterval(() => {
      progress += 10;
      setFiles((prev) => ({
        ...prev,
        [file.name]: {
          ...prev[file.name],
          progress: Math.min(progress, 95),
        },
      }));
    }, 100);

    await uploadToSupabase(newEntry);
  };

  const handleDelete = async (fileName: string) => {
    if (!user || !confirm(`Delete "${fileName}"?`)) return;

    const folderPath = roomId ? `room-${roomId}` : user.id;
    const { error } = await supabase.storage
      .from("user-files")
      .remove([`${folderPath}/${fileName}`]);

    if (error) {
      alert(`Failed to delete file "${fileName}": ${error.message}`);
      return;
    }

    setFiles((prev) => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  };

  const handleRename = async (oldName: string, newNameInput: string) => {
    if (!user) return;
    if (!newNameInput || newNameInput === oldName) {
      setRenamingFile(null);
      return;
    }

    const oldExtIndex = oldName.lastIndexOf(".");
    const oldExt = oldExtIndex !== -1 ? oldName.slice(oldExtIndex) : "";
    const newExtIndex = newNameInput.lastIndexOf(".");
    const hasExtension = newExtIndex !== -1;
    const newName = hasExtension ? newNameInput : newNameInput + oldExt;

    if (files[newName]) {
      alert(`File with name ${newName} already exists!`);
      return;
    }

    const folderPath = roomId ? `room-${roomId}` : user.id;
    const oldPath = `${folderPath}/${oldName}`;
    const newPath = `${folderPath}/${newName}`;

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from("user-files")
      .download(oldPath);

    if (downloadError || !downloadData) {
      alert("Failed to download file for renaming");
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("user-files")
      .upload(newPath, downloadData, { upsert: true });

    if (uploadError) {
      alert("Failed to upload file with new name");
      return;
    }

    const { error: deleteError } = await supabase.storage
      .from("user-files")
      .remove([oldPath]);

    if (deleteError) {
      alert("Failed to delete old file after renaming");
      return;
    }

    setFiles((prev) => {
      const updatedFiles = { ...prev };
      const entry = updatedFiles[oldName];
      delete updatedFiles[oldName];
      updatedFiles[newName] = {
        ...entry,
        name: newName,
      };
      return updatedFiles;
    });

    setRenamingFile(null);
  };

  const filteredFiles = Object.entries(files)
    .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort(([, a], [, b]) => b.lastModified - a.lastModified);

  return (
    <div className="p-6 space-y-6 bg-gray-700 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row gap-4">
        <label className="flex-1">
          <input
            type="file"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors"
          />
        </label>
        <input
          type="text"
          placeholder="Search files..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
        />
      </div>

      {filteredFiles.length === 0 && (
        <p className="text-center text-gray-400 text-sm font-medium">
          No files found. Upload some!
        </p>
      )}

      <ul className="space-y-4">
        {filteredFiles.map(([name, file]) => (
          <li
            key={name}
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="flex-1 flex items-center gap-3">
              <span className="text-lg">{getIcon(name)}</span>

              {renamingFile === name ? (
                <div className="flex items-center gap-3 w-full max-w-md">
                  <input
                    type="text"
                    className="flex-1 p-2 rounded-md border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleRename(name, newFileName.trim());
                      }
                      if (e.key === "Escape") {
                        setRenamingFile(null);
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={() => handleRename(name, newFileName.trim())}
                    className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors duration-150"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setRenamingFile(null)}
                    className="text-gray-400 hover:text-gray-200 px-3 py-1 transition-colors duration-150"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <a
                    href={getPublicUrl(name)}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-gray-200 hover:underline"
                  >
                    {name}
                  </a>
                  <span
                    className={
                      file.uploaded
                        ? "text-green-500 text-sm"
                        : "text-yellow-500 text-sm"
                    }
                  >
                    {file.uploaded ? "✅ Uploaded" : `⏳ ${file.progress}%`}
                  </span>
                </div>
              )}
            </div>

            {!renamingFile && (
              <div className="flex items-center gap-3 mt-3 sm:mt-0">
                <button
                  onClick={() => {
                    setRenamingFile(name);
                    setNewFileName(name.replace(/\.[^/.]+$/, ""));
                  }}
                  className="text-blue-500 hover:text-blue-400 text-sm transition-colors duration-150"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  className="text-red-500 hover:text-red-400 text-sm transition-colors duration-150"
                >
                  ❌
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}