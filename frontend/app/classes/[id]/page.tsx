'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import Navbar from '../../../components/Navbar';

interface ClassDetails {
  class_id: string;
  name: string;
  description: string;
  teacher_email: string;
  teacher_name: string;
  created_at: string;
  is_teacher: boolean;
  invite_code?: string;
  members: Array<{
    email: string;
    role: string;
    status: string;
    joined_at: string;
  }>;
}

interface FileMaterial {
  filename: string;
  chunks: number;
  uploaded_by: string;
  uploaded_at: string;
  summary?: string;
}

export default function ClassDetailPage() {
  const router = useRouter();
  const params = useParams();
  const classId = params.id as string;

  const [classDetails, setClassDetails] = useState<ClassDetails | null>(null);
  const [materials, setMaterials] = useState<FileMaterial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Ask feature state
  const [question, setQuestion] = useState('');
  const [level, setLevel] = useState('beginner');
  const [tone, setTone] = useState('friendly');
  const [answer, setAnswer] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [asking, setAsking] = useState(false);

  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  // Invite code copy
  const [copied, setCopied] = useState(false);

  // Edit class state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [updating, setUpdating] = useState(false);

  // Materials pagination
  const [showAllMaterials, setShowAllMaterials] = useState(false);
  const INITIAL_MATERIALS_DISPLAY = 3;

  // Summary generation
  const [generatingSummary, setGeneratingSummary] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchClassDetails();
    fetchMaterials();
  }, [classId]);

  const fetchClassDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/classes/${classId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401) {
        localStorage.removeItem('token');
        router.push('/login');
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to load class details');
      }

      const data = await response.json();
      setClassDetails(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchMaterials = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/classes/${classId}/materials`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMaterials(data.files || []);
      }
    } catch (err) {
      console.error('Failed to load materials:', err);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFiles || selectedFiles.length === 0) return;

    setUploading(true);
    setUploadMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      Array.from(selectedFiles).forEach((file) => {
        formData.append('files', file);
      });

      const response = await fetch(`http://localhost:5001/classes/${classId}/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadMessage(`Successfully uploaded ${selectedFiles.length} file(s)`);
      setSelectedFiles(null);
      fetchMaterials();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete ${filename}?`)) return;

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/classes/${classId}/materials/${filename}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to delete file');
      }

      fetchMaterials();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleAsk = async (e: React.FormEvent) => {
    e.preventDefault();
    setAsking(true);
    setError('');
    setAnswer('');
    setSources([]);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5001/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question,
          level,
          tone,
          class_id: classId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get answer');
      }

      setAnswer(data.answer);
      setSources(data.sources || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAsking(false);
    }
  };

  const copyInviteCode = () => {
    if (classDetails?.invite_code) {
      navigator.clipboard.writeText(classDetails.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleGenerateSummary = async (filename: string) => {
    setGeneratingSummary(filename);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(
        `http://localhost:5001/classes/${classId}/materials/${encodeURIComponent(filename)}/summary`,
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

      // Update the materials list with the new summary
      setMaterials((prevMaterials) =>
        prevMaterials.map((mat) =>
          mat.filename === filename ? { ...mat, summary: data.summary } : mat
        )
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGeneratingSummary(null);
    }
  };

  const handleEditClass = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    setError('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5001/classes/${classId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: editName,
          description: editDescription,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update class');
      }

      setShowEditModal(false);
      fetchClassDetails();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setUpdating(false);
    }
  };

  const openEditModal = () => {
    if (classDetails) {
      setEditName(classDetails.name);
      setEditDescription(classDetails.description);
      setShowEditModal(true);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  if (!classDetails) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Class not found</h2>
          <Link href="/classes" className="text-blue-600 hover:text-blue-700">
            Back to classes
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <Link href="/classes" className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-6">
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Classes
        </Link>
        {/* Class Header */}
        <div className="bg-white rounded-2xl p-8 shadow-lg mb-8">
          <div className="flex items-start justify-between mb-4">
            <div className="flex-1">
              <h1 className="text-4xl font-bold text-gray-900 mb-2">{classDetails.name}</h1>
              <p className="text-gray-600 text-lg">{classDetails.description}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`px-4 py-2 rounded-full text-sm font-semibold ${
                  classDetails.is_teacher
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}
              >
                {classDetails.is_teacher ? 'Teacher' : 'Student'}
              </span>
              {classDetails.is_teacher && (
                <button
                  onClick={openEditModal}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition text-sm font-semibold flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center text-gray-600 mb-4">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Teacher: {classDetails.teacher_name}
          </div>

          {classDetails.is_teacher && classDetails.invite_code && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-1">Invite Code</p>
                  <p className="text-lg font-mono font-bold text-gray-900">{classDetails.invite_code}</p>
                  <p className="text-xs text-gray-500 mt-1">Share this with students • Class ID: {classDetails.class_id}</p>
                </div>
                <button
                  onClick={copyInviteCode}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-semibold"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Materials Section */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Course Materials</h2>

            {classDetails.is_teacher && (
              <form onSubmit={handleUpload} className="mb-6 p-4 bg-gray-50 rounded-lg">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload New Materials
                </label>
                <input
                  type="file"
                  multiple
                  onChange={(e) => setSelectedFiles(e.target.files)}
                  className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 mb-3"
                />
                <button
                  type="submit"
                  disabled={uploading || !selectedFiles}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
                {uploadMessage && (
                  <p className="mt-2 text-sm text-green-600">{uploadMessage}</p>
                )}
              </form>
            )}

            {materials.length === 0 ? (
              <p className="text-gray-500 text-center py-8">No materials uploaded yet</p>
            ) : (
              <>
                <div className="space-y-3">
                  {(showAllMaterials ? materials : materials.slice(0, INITIAL_MATERIALS_DISPLAY)).map((file) => (
                    <div
                      key={file.filename}
                      className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{file.filename}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {file.chunks} chunks • by {file.uploaded_by}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {!file.summary && (
                            <button
                              onClick={() => handleGenerateSummary(file.filename)}
                              disabled={generatingSummary === file.filename}
                              className="px-3 py-1 text-sm text-blue-600 hover:text-blue-700 font-medium hover:bg-blue-50 rounded transition disabled:opacity-50"
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
                          {classDetails.is_teacher && (
                            <button
                              onClick={() => handleDelete(file.filename)}
                              className="px-3 py-1 text-sm text-red-600 hover:text-red-700 font-medium hover:bg-red-50 rounded transition"
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </div>
                      {file.summary && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
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
                
                {materials.length > INITIAL_MATERIALS_DISPLAY && (
                  <button
                    onClick={() => setShowAllMaterials(!showAllMaterials)}
                    className="mt-4 w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center justify-center gap-2 hover:bg-blue-50 rounded-lg transition"
                  >
                    {showAllMaterials ? (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                        </svg>
                        Show Less
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                        Show All ({materials.length} files)
                      </>
                    )}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Ask Questions Section */}
          <div className="bg-white rounded-2xl p-6 shadow-lg">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Ask TeachTwin</h2>

            <form onSubmit={handleAsk} className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Question
                </label>
                <textarea
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  required
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ask about the course materials..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Level</label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tone</label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="friendly">Friendly</option>
                    <option value="neutral">Neutral</option>
                    <option value="formal">Formal</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={asking}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
              >
                {asking ? 'Asking...' : 'Ask Question'}
              </button>
            </form>

            {answer && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Answer</h3>
                  <p className="text-gray-700 whitespace-pre-wrap">{answer}</p>
                </div>

                {sources.length > 0 && (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-semibold text-gray-900 mb-2 text-sm">Sources</h4>
                    <div className="flex flex-wrap gap-2">
                      {sources.map((source, idx) => (
                        <span
                          key={idx}
                          className="px-3 py-1 bg-white border border-gray-200 rounded-full text-xs text-gray-700"
                        >
                          {source}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Members Section */}
        <div className="mt-8 bg-white rounded-2xl p-6 shadow-lg">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Members ({classDetails.members.length})</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {classDetails.members.map((member) => (
              <div key={member.email} className="flex items-center p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{member.email}</p>
                  <p className="text-xs text-gray-500 capitalize">{member.role}</p>
                </div>
                {member.role === 'teacher' && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-semibold">
                    Teacher
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Edit Class Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Edit Class Details</h2>
            <form onSubmit={handleEditClass} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Class Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="e.g., Introduction to Python"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Brief description of the class"
                />
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg font-semibold hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition disabled:opacity-50"
                >
                  {updating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
