"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";
import Navbar from "../../components/Navbar";

type Level = "beginner" | "advanced";
type Tone = "friendly" | "neutral" | "formal";

export default function AskPage() {
  const router = useRouter();
  const [question, setQuestion] = useState("");
  const [level, setLevel] = useState<Level>("beginner");
  const [tone, setTone] = useState<Tone>("friendly");
  const [answer, setAnswer] = useState<string | null>(null);
  const [sources, setSources] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
    }
  }, [router]);

  const handleAsk = async () => {
    if (!question.trim()) {
      setError("Please enter a question.");
      setAnswer(null);
      setSources([]);
      return;
    }

    const token = localStorage.getItem("token");
    if (!token) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);
    setAnswer(null);
    setSources([]);

    try {
      const res = await axios.post(
        "http://localhost:5001/ask",
        {
          question,
          level,
          tone,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setAnswer(res.data.answer);
      setSources(res.data.sources || []);
    } catch (err: any) {
      console.error(err);
      if (err?.response?.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        router.push("/login");
      } else {
        setError(err?.response?.data?.error || "Something went wrong.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-4">
            <span className="text-gradient">Ask</span> TeachTwin
          </h1>
          <p className="text-lg text-slate-600 leading-relaxed">
            Ask questions about the course. TeachTwin will answer using only the
            uploaded materials and will show which documents it relied on.
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column - Input */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-2xl p-6 card-shadow border border-slate-100">
              <label className="block text-sm font-semibold text-slate-700 mb-3">
                Your Question
              </label>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                rows={6}
                className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                placeholder="e.g. Explain regression residuals using a sports example."
              />
              
              <button
                onClick={handleAsk}
                disabled={loading}
                className="mt-4 w-full px-6 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Thinking...
                  </span>
                ) : (
                  "Ask TeachTwin"
                )}
              </button>

              {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <p className="text-red-700 text-sm font-medium flex items-center gap-2">
                    <span className="text-xl">✕</span>
                    {error}
                  </p>
                </div>
              )}
            </div>

            {/* Answer Section */}
            {answer && (
              <div className="bg-white rounded-2xl p-6 card-shadow border border-slate-100 animate-in fade-in duration-500">
                <h2 className="text-xl font-semibold mb-4 text-slate-800 flex items-center gap-2">
                  <span className="text-2xl">💬</span>
                  Answer
                </h2>
                <div className="whitespace-pre-wrap text-slate-700 leading-relaxed bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                  {answer}
                </div>

                {sources.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-slate-200">
                    <h3 className="text-sm font-semibold mb-3 text-slate-700 flex items-center gap-2">
                      <span className="text-lg">📚</span>
                      Sources Used
                    </h3>
                    <ul className="space-y-2">
                      {sources.map((s, i) => (
                        <li
                          key={i}
                          className="flex items-start gap-3 text-sm text-slate-600 bg-slate-50 rounded-lg p-3"
                        >
                          <span className="text-blue-600 font-bold shrink-0">{i + 1}.</span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column - Settings */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl p-6 card-shadow border border-slate-100 sticky top-24">
              <h3 className="text-lg font-semibold mb-4 text-slate-800">Settings</h3>
              
              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Explanation Level
                  </label>
                  <select
                    value={level}
                    onChange={(e) => setLevel(e.target.value as Level)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                  >
                    <option value="beginner">🎓 Beginner (more scaffolding)</option>
                    <option value="advanced">🎯 Advanced (more technical)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-2">
                    Tone
                  </label>
                  <select
                    value={tone}
                    onChange={(e) => setTone(e.target.value as Tone)}
                    className="w-full border-2 border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all cursor-pointer"
                  >
                    <option value="friendly">😊 Friendly</option>
                    <option value="neutral">⚖️ Neutral</option>
                    <option value="formal">🎩 Formal</option>
                  </select>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-200">
                <p className="text-xs text-slate-500 leading-relaxed">
                  Customize how TeachTwin responds to better match your teaching style and student needs.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
