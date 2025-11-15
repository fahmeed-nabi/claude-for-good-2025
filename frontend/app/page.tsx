"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Navbar from "../components/Navbar";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // If user is logged in, redirect to classes page
    const token = localStorage.getItem("token");
    if (token) {
      router.push("/classes");
    }
  }, [router]);

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-6xl mx-auto px-6 py-16">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="inline-block mb-4">
            <span className="px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              AI-Powered Teaching Assistant
            </span>
          </div>
          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your AI Digital
            <br />
            <span className="text-gradient">Professor Twin</span>
          </h1>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Upload your syllabus, lecture notes, assignments, and announcements to
            create an AI assistant that answers student questions using your
            actual course materials, with citations and different explanation
            levels.
          </p>

          <div className="flex gap-4 justify-center flex-wrap">
            <Link
              href="/signup"
              className="px-8 py-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200"
            >
              Get Started Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-4 rounded-xl border-2 border-slate-300 bg-white font-semibold hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* How It Works Section */}
        <section className="mt-20">
          <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                step: "01",
                title: "Upload Materials",
                description: "Upload your course PDFs, text files, or notes."
              },
              {
                step: "02",
                title: "Build Knowledge Base",
                description: "TeachTwin builds a searchable knowledge base over your materials."
              },
              {
                step: "03",
                title: "Get Answers",
                description: "Students ask questions and get grounded answers with citations."
              },
              {
                step: "04",
                title: "Customize Output",
                description: "Toggle beginner vs. advanced explanations and tone of voice."
              }
            ].map((item) => (
              <div
                key={item.step}
                className="p-6 bg-white rounded-2xl card-shadow border border-slate-100"
              >
                <div className="text-4xl font-bold text-gradient mb-4">
                  {item.step}
                </div>
                <h3 className="text-lg font-semibold mb-2 text-slate-800">
                  {item.title}
                </h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Features Section */}
        <section className="mt-20 p-10 bg-white rounded-3xl card-shadow border border-slate-100">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: "📚",
                title: "Multi-Format Support",
                description: "Upload PDFs, text files, and various document formats"
              },
              {
                icon: "🎯",
                title: "Grounded Answers",
                description: "All responses include citations from your materials"
              },
              {
                icon: "⚡",
                title: "Instant Responses",
                description: "Get fast, accurate answers powered by AI"
              }
            ].map((feature) => (
              <div key={feature.title} className="text-center">
                <div className="text-5xl mb-4">{feature.icon}</div>
                <h3 className="text-lg font-semibold mb-2 text-slate-800">
                  {feature.title}
                </h3>
                <p className="text-slate-600 text-sm">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
