"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Navbar from "../../components/Navbar";

interface FileInfo {
  filename: string;
  upload_date: string;
  chunk_count: number;
  summary?: string;
}

export default function FilesPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);

  useEffect(() => {
    fetchFiles();
  }, []);

  const fetchFiles = async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    try {
      const response = await fetch("http://localhost:5001/files", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
        return;
      }

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch files");
      }

      setFiles(data.files);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
      return;
    }

    const token = localStorage.getItem("token");
    setDeleting(filename);

    try {
      const response = await fetch(`http://localhost:5001/files/${encodeURIComponent(filename)}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to delete file");
      }

      // Remove from list
      setFiles(files.filter((f) => f.filename !== filename));
    } catch (err: any) {
      alert(err.message || "Failed to delete file");
    } finally {
      setDeleting(null);
    }
  };

  const handleGenerateSummary = async (filename: string) => {
    setGeneratingSummary(filename);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5001/files/${encodeURIComponent(filename)}/summary`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate summary');
      }

      // Update the files list with the new summary
      setFiles((prevFiles) =>
        prevFiles.map((file) =>
          file.filename === filename ? { ...file, summary: data.summary } : file
        )
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingSummary(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 py-12">
        {/* Header with Back Button */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
            📚 My Files
          </h1>
          <p className="text-lg text-gray-600">Manage your uploaded course materials</p>
        </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="animate-spin h-10 w-10 text-indigo-600" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-2xl">
          {error}
        </div>
      ) : files.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">📭</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">No files yet</h2>
          <p className="text-gray-600 mb-6">Upload course materials to get started</p>
          <button
            onClick={() => router.push("/upload")}
            className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition"
          >
            Upload Files
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <p className="text-gray-600">{files.length} file{files.length !== 1 ? 's' : ''} uploaded</p>
            <button
              onClick={() => router.push("/upload")}
              className="px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:shadow-lg hover:scale-[1.02] transition"
            >
              + Upload More
            </button>
          </div>
          {files.map((file) => (
            <div
              key={file.filename}
              className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all border border-gray-100"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center space-x-4 flex-1">
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-md">
                    <span className="text-2xl">
                      {file.filename.endsWith(".pdf") ? "📄" : "📝"}
                    </span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-800 text-lg group-hover:text-indigo-600 transition">
                      {file.filename}
                    </h3>
                    <p className="text-sm text-gray-500">
                      Uploaded {new Date(file.upload_date).toLocaleDateString()} • {file.chunk_count} chunks
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {!file.summary && (
                    <button
                      onClick={() => handleGenerateSummary(file.filename)}
                      disabled={generatingSummary === file.filename}
                      className="px-3 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded transition disabled:opacity-50"
                    >
                      {generatingSummary === file.filename ? (
                        <span className="flex items-center gap-1">
                          <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          Generating...
                        </span>
                      ) : (
                        '✨ Summarize'
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(file.filename)}
                    disabled={deleting === file.filename}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white font-medium rounded-xl transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {deleting === file.filename ? (
                      <span className="flex items-center">
                        <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Deleting...
                      </span>
                    ) : (
                      "Delete"
                    )}
                  </button>
                </div>
              </div>
              {file.summary && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-start justify-between">
                    <p className="text-sm text-gray-600 italic flex-1">
                      <span className="font-medium text-gray-700">Summary:</span> {file.summary}
                    </p>
                    <button
                      onClick={() => handleGenerateSummary(file.filename)}
                      disabled={generatingSummary === file.filename}
                      className="ml-2 text-xs text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                      title="Regenerate summary"
                    >
                      {generatingSummary === file.filename ? '...' : '🔄'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
