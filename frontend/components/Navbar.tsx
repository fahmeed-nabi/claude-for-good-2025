"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<{ name: string; email: string } | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userData = localStorage.getItem("user");
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, [pathname]);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setUser(null);
    router.push("/login");
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-lg bg-white/70 border-b border-slate-200/60 shadow-sm">
      <div className="max-w-6xl mx-auto flex items-center justify-between py-4 px-6">
        <Link href="/" className="group flex items-center gap-2">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center transform group-hover:scale-105 transition-transform duration-200">
            <span className="text-white font-bold text-lg">TT</span>
          </div>
          <span className="font-bold text-xl text-gradient">TeachTwin</span>
        </Link>
        <div className="flex items-center gap-2">
          {user && (
            <Link
              href="/classes"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname?.startsWith("/classes")
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-700 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              Classes
            </Link>
          )}
          <Link
            href="/upload"
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              pathname === "/upload"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-700 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Upload
          </Link>
          <Link
            href="/ask"
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
              pathname === "/ask"
                ? "bg-blue-100 text-blue-700"
                : "text-slate-700 hover:text-blue-600 hover:bg-blue-50"
            }`}
          >
            Ask
          </Link>
          {user && (
            <Link
              href="/files"
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                pathname === "/files"
                  ? "bg-blue-100 text-blue-700"
                  : "text-slate-700 hover:text-blue-600 hover:bg-blue-50"
              }`}
            >
              My Files
            </Link>
          )}
          {user ? (
            <div className="flex items-center gap-3 ml-2">
              <span className="text-sm text-slate-600">👋 {user.name}</span>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm font-medium bg-red-500 text-white rounded-lg hover:bg-red-600 transition-all duration-200"
              >
                Logout
              </button>
            </div>
          ) : (
            <Link
              href="/login"
              className="px-4 py-2 text-sm font-medium bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:scale-105 transition-all duration-200 ml-2"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
