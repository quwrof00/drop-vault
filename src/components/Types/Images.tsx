import { get, set } from "idb-keyval";
import { supabase } from "../../lib/supabase-client";
import { useAuthUser } from "../../hooks/useAuthUser";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const getFilesKey = (userId: string) => `my_image_files_${userId}`;

type FileEntry = {
  name: string;
  blob: Blob;
  uploaded: boolean;
  lastModified: number;
  progress: number;
  url?: string;
  previewUrl?: string;
};

const isImageFile = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase();
  return !!ext && ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext);
};

export default function Images() {
  const user = useAuthUser();
  const getPublicUrl = (fileName: string) => {
  const { data } = supabase.storage
    .from("user-images")
    .getPublicUrl(`${user?.id}/${fileName}`);
  return data.publicUrl;
};
  const navigate = useNavigate();
  const [files, setFiles] = useState<{ [key: string]: FileEntry }>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [renamingFile, setRenamingFile] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState<string>("");

  useEffect(() => {
    if (user === undefined) return;
    if (!user) {
      navigate("/login");
      return;
    }

    (async () => {
      const FILES_KEY = getFilesKey(user.id);
      const localFiles = (await get(FILES_KEY)) || {};

      const { data: supabaseFiles, error } = await supabase.storage
        .from("user-images")
        .list(user.id);

      if (error) {
        console.error("Failed to fetch Supabase files", error);
        setFiles(localFiles);
        return;
      }

      const mergedFiles: { [key: string]: FileEntry } = { ...localFiles };

      supabaseFiles?.forEach((file) => {
        const fileName = file.name;
        const publicUrl = getPublicUrl(fileName);

        if (!mergedFiles[fileName]) {
          mergedFiles[fileName] = {
            name: fileName,
            blob: new Blob(),
            uploaded: true,
            lastModified: new Date(file.updated_at || file.created_at || Date.now()).getTime(),
            progress: 100,
            url: publicUrl,
            previewUrl: publicUrl, // fix: show Supabase-hosted image preview
          };
        } else {
          if (!mergedFiles[fileName].previewUrl && mergedFiles[fileName].blob) {
            mergedFiles[fileName].previewUrl = URL.createObjectURL(mergedFiles[fileName].blob);
          }
        }
      });

      setFiles(mergedFiles);
      await set(FILES_KEY, mergedFiles);
    })();
  }, [user, navigate]);

  useEffect(() => {
    return () => {
      Object.values(files).forEach((file) => {
        if (file.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(file.previewUrl);
        }
      });
    };
  }, [files]);

  if (user === undefined) {
    return <p className="text-center mt-10 text-gray-500 text-lg">Loading...</p>;
  }

  const uploadToSupabase = async (fileEntry: FileEntry) => {
    if (!user) return;
    const cleanedName = fileEntry.name.replace(/\[|\]/g, "");
    fileEntry.name = cleanedName;
    const path = `${user.id}/${fileEntry.name}`;

    try {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setFiles((prev) => ({
          ...prev,
          [fileEntry.name]: {
            ...prev[fileEntry.name],
            progress: Math.min(progress, 95),
          },
        }));
      }, 100);

      const { error: uploadError } = await supabase.storage
        .from("user-images")
        .upload(path, fileEntry.blob, { upsert: true });

      clearInterval(interval);

      if (!uploadError) {
        const publicUrl = getPublicUrl(fileEntry.name);
        setFiles((prev) => {
          const updated = {
            ...prev,
            [fileEntry.name]: {
              ...fileEntry,
              uploaded: true,
              progress: 100,
              url: publicUrl,
              previewUrl: publicUrl,
            },
          };
          void set(getFilesKey(user.id), updated);
          return updated;
        });
      } else {
        console.error("Upload error:", uploadError);
        alert(`Upload failed: ${uploadError.message}`);
      }
    } catch (err) {
      console.error("Upload exception:", err);
      alert(`Failed to upload ${fileEntry.name}`);
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

    const nameWithoutExtension = fileName.replace(/\.[^/.]+$/, '');
    const isValidName = /^[a-zA-Z0-9 _-]+$/.test(nameWithoutExtension);

    if (!isValidName) {
      alert('Only letters, numbers, spaces, _ and - are allowed in the name.');
      e.target.value = '';
      return;
    }

    if (!isImageFile(file.name)) {
      alert("Please upload a valid image file.");
      return;
    }

    const newEntry: FileEntry = {
      name: file.name,
      blob: file,
      uploaded: false,
      lastModified: file.lastModified,
      progress: 0,
      previewUrl: URL.createObjectURL(file),
    };

    const updated = {
      ...files,
      [file.name]: newEntry,
    };

    setFiles(updated);
    await set(getFilesKey(user.id), updated);
    await uploadToSupabase(newEntry);
  };

  const handleDelete = async (fileName: string) => {
    if (!user || !confirm(`Delete "${fileName}"?`)) return;

    const updated = { ...files };
    delete updated[fileName];
    setFiles(updated);
    await set(getFilesKey(user.id), updated);

    const { error } = await supabase.storage
      .from("user-images")
      .remove([`${user.id}/${fileName}`]);

    if (error) {
      alert(`Failed to delete file "${fileName}": ${error.message}`);
    }
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

    if (!isImageFile(newName)) {
      alert("New file name must be a valid image file type.");
      return;
    }

    const oldPath = `${user.id}/${oldName}`;
    const newPath = `${user.id}/${newName}`;

    const { data: downloadData, error: downloadError } = await supabase.storage
      .from("user-images")
      .download(oldPath);

    if (downloadError || !downloadData) {
      console.error("Download error:", downloadError);
      alert("Failed to download file for renaming");
      return;
    }

    const { error: uploadError } = await supabase.storage
      .from("user-images")
      .upload(newPath, downloadData, { upsert: true });

    if (uploadError) {
      console.error("Upload error:", uploadError);
      alert("Failed to upload file with new name");
      return;
    }

    const { error: deleteError } = await supabase.storage
      .from("user-images")
      .remove([oldPath]);

    if (deleteError) {
      console.error("Delete error:", deleteError);
      alert(`Failed to delete old file "${oldName}": ${deleteError.message}`);
      return;
    }

    const updatedFiles = { ...files };
    const entry = updatedFiles[oldName];
    delete updatedFiles[oldName];

    const publicUrl = getPublicUrl(newName);
    updatedFiles[newName] = {
      ...entry,
      name: newName,
      previewUrl: publicUrl,
      url: publicUrl,
    };

    setFiles(updatedFiles);
    await set(getFilesKey(user.id), updatedFiles);
    setRenamingFile(null);
  };

  const filteredFiles = Object.entries(files)
    .filter(([name]) => isImageFile(name))
    .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort(([, a], [, b]) => b.lastModified - a.lastModified);

  return (
  <div className="p-6 space-y-6 bg-white rounded-lg shadow-sm">
    <div className="flex flex-col sm:flex-row gap-4">
      <label className="flex-1">
        <input
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
        />
      </label>
      <input
        type="text"
        placeholder="Search images..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="flex-1 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-400"
      />
    </div>

    {filteredFiles.length === 0 && (
      <p className="text-center text-gray-500">No images found. Upload some!</p>
    )}

    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredFiles.map(([name, file]) => (
        <div key={name} className="bg-gray-50 rounded-md shadow-sm hover:shadow-md transition-shadow p-4">
          <div className="relative">
            <img
              src={file.previewUrl}
              alt={name}
              className="w-full h-48 object-cover rounded-md mb-3"
            />
            {!file.uploaded && renamingFile !== name && (
              <div className="absolute bottom-0 w-full bg-gray-200 rounded-b-md h-2">
                <div
                  className="bg-blue-500 h-2 rounded-b-md transition-all duration-300"
                  style={{ width: `${file.progress}%` }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            {renamingFile === name ? (
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  className="flex-1 p-2 rounded-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
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
                  className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Save
                </button>
                <button
                  onClick={() => setRenamingFile(null)}
                  className="text-gray-500 hover:text-gray-700 px-3 py-1"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="font-medium text-gray-800 truncate">{name}</span>
                <span
                  className={
                    file.uploaded
                      ? "text-green-600 text-sm"
                      : "text-yellow-600 text-sm"
                  }
                >
                  {file.uploaded ? "✅ Uploaded" : "⏳ Uploading"}
                </span>
              </div>
            )}

            {file.uploaded && renamingFile !== name && (
              <div className="flex gap-3">
                <a
                  href={getPublicUrl(name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  🔍 Preview
                </a>
                <a
                  href={getPublicUrl(name)}
                  download={name}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  ⬇️ Download
                </a>
              </div>
            )}

            {renamingFile !== name && (
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setRenamingFile(name);
                    setNewFileName(name);
                  }}
                  className="text-yellow-600 hover:text-yellow-800"
                  title="Rename image"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleDelete(name)}
                  className="text-red-500 hover:text-red-700"
                  title="Delete image"
                >
                  ❌
                </button>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);
}
