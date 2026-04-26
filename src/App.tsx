import React, { createContext, useContext, useEffect, useState } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { auth, db } from "./firebase";
import { doc, onSnapshot } from "firebase/firestore";
import { User } from "./types";
import Home from "./pages/Home";
import ListingDetail from "./pages/ListingDetail";
import Sell from "./pages/Sell";
import Profile from "./pages/Profile";
import SellerProfile from "./pages/SellerProfile";
import Chat from "./pages/Chat";
import Admin from "./pages/Admin";
import Header from "./components/Header";
import { motion, AnimatePresence } from "framer-motion";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  showLoginModal: boolean;
  setShowLoginModal: (show: boolean) => void;
  deferredPrompt: any;
  installApp: () => void;
}

const AuthContext = createContext<AuthContextType>({ 
  user: null, 
  loading: true,
  showLoginModal: false,
  setShowLoginModal: () => {},
  deferredPrompt: null,
  installApp: () => {}
});

export const useAuth = () => useContext(AuthContext);

import LoginModal from "./components/LoginModal";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // ... rest of useEffect
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Listen to user profile changes
        const userRef = doc(db, "users", firebaseUser.uid);
        onSnapshot(userRef, (doc) => {
          if (doc.exists()) {
            setUser({ ...doc.data(), uid: firebaseUser.uid, email: firebaseUser.email || doc.data().email } as any);
          } else {
            setUser({ uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName, isVerified: true, createdAt: new Date().toISOString() } as any);
          }
          setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      unsubscribe();
    };
  }, []);

  const installApp = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-stone-50">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
          className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading, showLoginModal, setShowLoginModal, deferredPrompt, installApp }}>
      <Router>
        <div className="min-h-screen bg-stone-50 text-stone-900 font-sans">
          <Header />
          <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/listing/:id" element={<ListingDetail />} />
                <Route path="/seller/:id" element={<SellerProfile />} />
                <Route path="/admin" element={<Admin />} />
                <Route path="/sell" element={user ? <Sell /> : <Navigate to="/" />} />
                <Route path="/profile" element={user ? <Profile /> : <Navigate to="/" />} />
                <Route path="/chat/:chatId" element={user ? <Chat /> : <Navigate to="/" />} />
              </Routes>
            </AnimatePresence>
          </main>
          <LoginModal />
        </div>
      </Router>
    </AuthContext.Provider>
  );
}
