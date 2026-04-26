import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, Plus, User as UserIcon, LogIn, LogOut, MessageCircle, Download, ShieldAlert } from "lucide-react";
import { useAuth } from "../App";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

export default function Header() {
  const { user, setShowLoginModal, deferredPrompt, installApp } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/?q=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <header className="bg-teal-900 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-gold-500 rounded-full flex items-center justify-center shadow-inner">
              <span className="text-teal-900 font-bold text-xl italic">.IN</span>
            </div>
            <span className="text-2xl font-bold tracking-tight hidden sm:block">
              Insta <span className="text-gold-500">Next.in</span>
            </span>
          </Link>

          {/* Search Bar (Desktop) */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative">
              <input
                type="text"
                placeholder="Search for goods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-teal-800 text-white placeholder-teal-300 border-none rounded-full py-2 pl-10 pr-4 focus:ring-2 focus:ring-gold-500 transition-all"
              />
              <Search className="absolute left-3 top-2.5 w-5 h-5 text-teal-300" />
            </div>
          </form>

          {/* Actions */}
          <nav className="flex items-center space-x-4">
            {user ? (
              <>
                {deferredPrompt && (
                  <button 
                    onClick={installApp} 
                    className="flex items-center space-x-1 bg-stone-100 text-teal-900 border border-teal-900 px-4 py-2 rounded-full font-semibold hover:bg-stone-200 transition-colors shadow-sm hidden sm:flex"
                  >
                    <Download className="w-4 h-4" />
                    <span>Install App</span>
                  </button>
                )}
                <Link to="/sell" className="flex items-center space-x-1 bg-gold-500 text-teal-900 px-4 py-2 rounded-full font-semibold hover:bg-gold-600 transition-colors shadow-md">
                  <Plus className="w-5 h-5" />
                  <span>Sell</span>
                </Link>
                {user.email === "secondinnings17@gmail.com" && (
                  <Link to="/admin" className="flex items-center space-x-1 bg-red-100 text-red-900 border border-red-200 px-4 py-2 rounded-full font-semibold hover:bg-red-200 transition-colors shadow-sm hidden sm:flex">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Admin</span>
                  </Link>
                )}
                <Link to="/profile" className="p-2 hover:bg-teal-800 rounded-full transition-colors relative">
                  <UserIcon className="w-6 h-6" />
                  {user.isVerified && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-gold-500 border-2 border-teal-900 rounded-full" />
                  )}
                </Link>
                <button onClick={() => signOut(auth)} className="p-2 hover:bg-teal-800 rounded-full transition-colors">
                  <LogOut className="w-6 h-6" />
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowLoginModal(true)}
                className="flex items-center space-x-2 bg-white text-teal-900 px-4 py-2 rounded-full font-semibold hover:bg-stone-100 transition-colors shadow-md"
              >
                <LogIn className="w-5 h-5" />
                <span>Login</span>
              </button>
            )}
          </nav>
        </div>

        {/* Search Bar (Mobile) */}
        <div className="pb-4 md:hidden">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <input
                type="text"
                placeholder="Search for goods..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-teal-800 text-white placeholder-teal-300 border-none rounded-full py-2.5 pl-10 pr-4 focus:ring-2 focus:ring-gold-500 transition-all"
              />
              <Search className="absolute left-3 top-3 w-5 h-5 text-teal-300" />
            </div>
          </form>
        </div>
      </div>
    </header>
  );
}
