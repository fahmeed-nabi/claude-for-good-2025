"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Navbar from "../../components/Navbar";

export default function UploadPage() {
  const router = useRouter();
  const [files, setFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleUpload = async () => {
    if (!files || files.length === 0) {
      setError("Please select at least one file.");
      setMessage(null);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setIsUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      Array.from(files).forEach((file) => {
        formData.append("files", file);
      });

      const res = await axios.post(
        "http://localhost:5001/upload",
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.data.status === "ok") {
        setMessage("Documents uploaded and indexed successfully.");
        setFiles(null);
        const fileInput = document.getElementById("file-upload") as HTMLInputElement;
        if (fileInput) fileInput.value = "";
      } else {
        setError("Upload completed but response was unexpected.");
      }
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      } else {
        setError(err?.response?.data?.error || "Upload failed.");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Upload Course Materials
          </h1>
          <p className="text-lg text-gray-600 leading-relaxed">
            Upload syllabi, lecture slides exported as PDFs, assignment
            descriptions, and other course documents. TeachTwin will index them so
            it can answer questions grounded in your actual materials.
          </p>
        </div>

        <div className="bg-white rounded-2xl p-8 shadow-lg border border-gray-100">
          <div className="mb-6">
            <label
              htmlFor="file-upload"
              className="block text-sm font-semibold text-gray-700 mb-3"
            >
              Select Files
            </label>
            <div className="relative">
              <input
                id="file-upload"
                type="file"
                multiple
                onChange={(e) => setFiles(e.target.files)}
                className="block w-full text-sm text-gray-600 file:mr-4 file:py-3 file:px-6 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-gradient-to-r file:from-indigo-500 file:to-purple-600 file:text-white hover:file:scale-105 file:transition-all file:duration-200 file:shadow-md cursor-pointer border-2 border-dashed border-gray-300 rounded-xl p-4 hover:border-indigo-400 transition-colors"
              />
            </div>
            {files && files.length > 0 && (
              <div className="mt-3 text-sm text-gray-600">
                <span className="font-medium">{files.length}</span> file{files.length > 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg hover:scale-[1.02] transition disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {isUploading ? "Uploading..." : "Upload & Index"}
          </button>
        </div>

        {message && (
          <div className="mt-4 bg-green-50 border border-green-200 text-green-700 px-6 py-4 rounded-xl">
            {message}
          </div>
        )}
        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl">
            {error}
          </div>
        )}

        <section className="mt-8 bg-white rounded-xl p-6 shadow-md border border-gray-100">
          <h2 className="font-semibold text-gray-800 mb-3 flex items-center">
            <span className="text-xl mr-2">💡</span> Tips
          </h2>
          <ul className="space-y-2 text-sm text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Use PDFs or plain text files for best results.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>Include your syllabus, key lectures, and assignments.</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">•</span>
              <span>You can come back and upload more files at any time; they'll be added to the same knowledge base.</span>
            </li>
          </ul>
        </section>
      </main>
    </div>
  );
}
