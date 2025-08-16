"use client"

import type React from "react"
import { supabase } from "../../lib/supabase-client"
import { useAuthUser } from "../../hooks/useAuthUser"
import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"

type FileEntry = {
  name: string
  blob: Blob
  uploaded: boolean
  lastModified: number
  progress: number
  url?: string
  previewUrl?: string
  // Folder path prefix where this file lives (e.g., "room-123" or "users/abc" or legacy "abc")
  pathPrefix: string
}

type ImagesProps = {
  roomId?: string | null
}

const BUCKET = "user-images"

// Feature flags
const USE_NAMESPACED_PATHS = true // room-<roomId> or users/<userId>
const INCLUDE_LEGACY_LISTING = true // also list legacy "<roomId_or_userId>/" and merge

const isImageFile = (name: string) => {
  const ext = name.split(".").pop()?.toLowerCase()
  return !!ext && ["png", "jpg", "jpeg", "gif", "svg", "webp"].includes(ext)
}

const getBaseName = (fileName: string) => fileName.replace(/\.[^/.]+$/, "")

const isValidBaseName = (base: string) => /^[a-zA-Z0-9 _-]+$/.test(base)

export default function Images({ roomId }: ImagesProps) {
  const user = useAuthUser()
  const navigate = useNavigate()

  const [files, setFiles] = useState<{ [key: string]: FileEntry }>({})
  const [searchTerm, setSearchTerm] = useState("")
  const [renamingFile, setRenamingFile] = useState<string | null>(null)
  const [newFileName, setNewFileName] = useState<string>("")
  const [isLoading, setIsLoading] = useState(false)

  const prefixes = useMemo(() => {
    if (!user) return { primary: "", legacy: "" }
    if (USE_NAMESPACED_PATHS) {
      return {
        primary: roomId ? `room-${roomId}` : `users/${user.id}`,
        legacy: roomId ? `${roomId}` : `${user.id}`,
      }
    }
    // Legacy only
    const legacy = roomId ?? user.id
    return { primary: legacy as string, legacy: legacy as string }
  }, [user, roomId])

  const makePublicUrl = (pathPrefix: string, fileName: string) => {
    const { data } = supabase.storage.from(BUCKET).getPublicUrl(`${pathPrefix}/${fileName}`)
    return data.publicUrl
  }

  // Fetch files from Supabase Storage
  useEffect(() => {
    if (user === undefined) return
    if (!user) {
      navigate("/login")
      return
    }

    let cancelled = false
    ;(async () => {
      setIsLoading(true)
      try {
        const mergedFiles: { [key: string]: FileEntry } = {}

        // List primary prefix first
        const { data: primaryList, error: primaryErr } = await supabase.storage.from(BUCKET).list(prefixes.primary)
        if (primaryErr) {
          console.error("Failed to list primary prefix", primaryErr)
        } else {
          primaryList?.forEach((file) => {
            const fileName = file.name
            const publicUrl = makePublicUrl(prefixes.primary, fileName)
            mergedFiles[fileName] = {
              name: fileName,
              blob: new Blob(),
              uploaded: true,
              lastModified: new Date(file.updated_at || file.created_at || Date.now()).getTime(),
              progress: 100,
              url: publicUrl,
              previewUrl: publicUrl,
              pathPrefix: prefixes.primary,
            }
          })
        }

        // Optionally list legacy and merge (skip duplicates, prefer primary)
        if (INCLUDE_LEGACY_LISTING && prefixes.legacy && prefixes.legacy !== prefixes.primary) {
          const { data: legacyList, error: legacyErr } = await supabase.storage.from(BUCKET).list(prefixes.legacy)
          if (legacyErr) {
            console.error("Failed to list legacy prefix", legacyErr)
          } else {
            legacyList?.forEach((file) => {
              const fileName = file.name
              if (!mergedFiles[fileName]) {
                const publicUrl = makePublicUrl(prefixes.legacy, fileName)
                mergedFiles[fileName] = {
                  name: fileName,
                  blob: new Blob(),
                  uploaded: true,
                  lastModified: new Date(file.updated_at || file.created_at || Date.now()).getTime(),
                  progress: 100,
                  url: publicUrl,
                  previewUrl: publicUrl,
                  pathPrefix: prefixes.legacy,
                }
              }
            })
          }
        }

        if (!cancelled) {
          setFiles(mergedFiles)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [user, navigate, prefixes])

  // Revoke any blob: preview URLs on unmount or when files change
  useEffect(() => {
    return () => {
      Object.values(files).forEach((file) => {
        if (file.previewUrl?.startsWith("blob:")) {
          URL.revokeObjectURL(file.previewUrl)
        }
      })
    }
  }, [files])

  if (user === undefined) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-700">
        <p className="text-gray-300 text-lg font-medium animate-pulse">Loading...</p>
      </div>
    )
  }

  const uploadToSupabase = async (fileEntry: FileEntry) => {
    if (!user) return

    const path = roomId ? `room-${roomId}/${fileEntry.name}` : `users/${user.id}/${fileEntry.name}`

    try {
      let progress = 0
      const interval = setInterval(() => {
        progress += 10
        setFiles((prev) => ({
          ...prev,
          [fileEntry.name]: {
            ...prev[fileEntry.name],
            progress: Math.min(progress, 95),
          },
        }))
      }, 100)

      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, fileEntry.blob, {
        upsert: true,
      })

      clearInterval(interval)

      if (!uploadError) {
        const pathPrefix = roomId ? `room-${roomId}` : `users/${user.id}`
        const publicUrl = makePublicUrl(pathPrefix, fileEntry.name)

        setFiles((prev) => ({
          ...prev,
          [fileEntry.name]: {
            ...fileEntry,
            uploaded: true,
            progress: 100,
            url: publicUrl,
            previewUrl: publicUrl,
            pathPrefix,
          },
        }))
      } else {
        console.error("Upload error:", uploadError)
        alert(`Upload failed: ${uploadError.message}`)
        setFiles((prev) => ({
          ...prev,
          [fileEntry.name]: {
            ...prev[fileEntry.name],
            progress: 0,
          },
        }))
      }
    } catch (err) {
      console.error("Upload exception:", err)
      alert(`Failed to upload ${fileEntry.name}`)
    }
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    const fileName = file.name
    if (files[fileName]) {
      alert(`File with name ${fileName} already exists!`)
      return
    }

    const nameWithoutExtension = getBaseName(fileName).trim()
    if (!isValidBaseName(nameWithoutExtension)) {
      alert("Only letters, numbers, spaces, _ and - are allowed in the name.")
      e.target.value = ""
      return
    }

    if (!isImageFile(file.name)) {
      alert("Please upload a valid image file.")
      return
    }

    const newEntry: FileEntry = {
      name: file.name,
      blob: file,
      uploaded: false,
      lastModified: file.lastModified,
      progress: 0,
      previewUrl: URL.createObjectURL(file),
      pathPrefix: prefixes.primary, // Target the primary (namespaced) path
    }

    setFiles((prev) => ({
      ...prev,
      [file.name]: newEntry,
    }))

    await uploadToSupabase(newEntry)
    // Clear input to allow re-uploading same file name later if desired
    e.currentTarget.value = ""
  }

  const handleDelete = async (fileName: string) => {
    if (!user || !confirm(`Delete "${fileName}"?`)) return
    const entry = files[fileName]
    const prefix = entry?.pathPrefix || prefixes.primary

    const { error } = await supabase.storage.from(BUCKET).remove([`${prefix}/${fileName}`])
    if (error) {
      alert(`Failed to delete file "${fileName}": ${error.message}`)
      return
    }

    setFiles((prev) => {
      const updated = { ...prev }
      delete updated[fileName]
      return updated
    })
  }

  const handleRename = async (oldName: string, newNameInput: string) => {
    if (!user) return
    if (!newNameInput || newNameInput === oldName) {
      setRenamingFile(null)
      return
    }

    // Preserve/append extension
    const oldExtIndex = oldName.lastIndexOf(".")
    const oldExt = oldExtIndex !== -1 ? oldName.slice(oldExtIndex) : ""
    const newExtIndex = newNameInput.lastIndexOf(".")
    const hasExtension = newExtIndex !== -1
    const newName = (hasExtension ? newNameInput : newNameInput + oldExt).trim()

    if (files[newName]) {
      alert(`File with name ${newName} already exists!`)
      return
    }
    if (!isImageFile(newName)) {
      alert("New file name must be a valid image file type.")
      return
    }
    const newBase = getBaseName(newName)
    if (!isValidBaseName(newBase)) {
      alert("Only letters, numbers, spaces, _ and - are allowed in the name.")
      return
    }

    const oldEntry = files[oldName]
    const prefix = oldEntry?.pathPrefix || prefixes.primary
    const oldPath = `${prefix}/${oldName}`
    const newPath = `${prefix}/${newName}`

    const { data: downloadData, error: downloadError } = await supabase.storage.from(BUCKET).download(oldPath)
    if (downloadError || !downloadData) {
      console.error("Download error:", downloadError)
      alert("Failed to download file for renaming")
      return
    }

    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(newPath, downloadData, {
      upsert: true,
    })
    if (uploadError) {
      console.error("Upload error:", uploadError)
      alert("Failed to upload file with new name")
      return
    }

    const { error: deleteError } = await supabase.storage.from(BUCKET).remove([oldPath])
    if (deleteError) {
      console.error("Delete error:", deleteError)
      alert(`Failed to delete old file "${oldName}": ${deleteError.message}`)
      return
    }

    const publicUrl = makePublicUrl(prefix, newName)
    setFiles((prev) => {
      const updatedFiles = { ...prev }
      const entry = updatedFiles[oldName]
      delete updatedFiles[oldName]
      updatedFiles[newName] = {
        ...(entry ?? {
          name: newName,
          blob: new Blob(),
          uploaded: true,
          lastModified: Date.now(),
          progress: 100,
        }),
        name: newName,
        previewUrl: publicUrl,
        url: publicUrl,
        pathPrefix: prefix,
      }
      return updatedFiles
    })
    setRenamingFile(null)
  }

  const filteredFiles = Object.entries(files)
    .filter(([name]) => isImageFile(name))
    .filter(([name]) => name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort(([, a], [, b]) => b.lastModified - a.lastModified)

  return (
    <div className="p-6 space-y-6 bg-gray-700 rounded-lg shadow-md">
      <div className="flex flex-col sm:flex-row gap-4">
        <label className="flex-1">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600 file:text-white hover:file:bg-blue-700 transition-colors duration-150"
          />
        </label>
        <input
          type="text"
          placeholder="Search images..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 p-3 rounded-lg border border-gray-600 bg-gray-700 text-gray-200 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200 ease-in-out"
        />
      </div>

      {isLoading && <p className="text-center text-gray-400 text-sm font-medium">Loading images...</p>}

      {!isLoading && filteredFiles.length === 0 && (
        <p className="text-center text-gray-400 text-sm font-medium">No images found. Upload some!</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredFiles.map(([name, file]) => (
          <div
            key={name}
            className="bg-gray-800 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 p-4"
          >
            <div className="relative">
              <img src={file.url || file.previewUrl} alt={name} className="w-full h-48 object-cover rounded-md mb-3" />
              {!file.uploaded && renamingFile !== name && (
                <div className="absolute bottom-0 w-full bg-gray-600 rounded-b-md h-2" aria-label="Upload progress">
                  <div
                    className="bg-blue-500 h-2 rounded-b-md transition-all duration-300"
                    style={{ width: `${file.progress}%` }}
                    role="progressbar"
                    aria-valuenow={file.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              {renamingFile === name ? (
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    className="flex-1 p-2 rounded-md border border-gray-600 bg-gray-700 text-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleRename(name, newFileName.trim())
                      }
                      if (e.key === "Escape") {
                        setRenamingFile(null)
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
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-200 truncate">{name}</span>
                  <span className={file.uploaded ? "text-green-500 text-sm" : "text-yellow-500 text-sm"}>
                    {file.uploaded ? "✅ Uploaded" : "⏳ Uploading"}
                  </span>
                </div>
              )}

              {file.uploaded && renamingFile !== name && (
                <div className="flex gap-3">
                  <a
                    href={makePublicUrl(file.pathPrefix, name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-400 text-sm font-medium"
                  >
                    🔍 Preview
                  </a>
                  <a
                    href={makePublicUrl(file.pathPrefix, name)}
                    download={name}
                    className="text-blue-500 hover:text-blue-400 text-sm font-medium"
                  >
                    ⬇️ Download
                  </a>
                </div>
              )}

              {renamingFile !== name && (
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setRenamingFile(name)
                      setNewFileName(name)
                    }}
                    className="text-yellow-500 hover:text-yellow-400 transition-colors duration-150"
                    title="Rename image"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDelete(name)}
                    className="text-red-500 hover:text-red-400 transition-colors duration-150"
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
  )
}
