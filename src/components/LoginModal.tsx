import React, { useState } from "react";
import { auth, db } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { X, Loader2, LogIn } from "lucide-react";
import { useAuth } from "../App";

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const resetState = () => {
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    setShowLoginModal(false);
    resetState();
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError("");
    
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: user.displayName || "User " + user.uid.slice(0, 5),
          email: user.email,
          photoURL: user.photoURL,
          isVerified: true,
          createdAt: new Date().toISOString()
        });
      }
      handleClose();
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm ${!showLoginModal ? 'hidden' : ''}`}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative">
        <button 
          onClick={handleClose} 
          className="absolute top-4 right-4 text-stone-400 hover:text-stone-600 transition-colors"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="p-8">
          <div className="flex justify-center mb-6">
             <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center">
                 <LogIn className="w-8 h-8 text-teal-600" />
             </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-teal-900 mb-2">
            Welcome to InstaNext
          </h2>
          <p className="text-center text-stone-500 mb-8">
            Log in or sign up with your Google account
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70 gap-2"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Sign in with Google"}
          </button>
        </div>
      </div>
    </div>
  );
}

