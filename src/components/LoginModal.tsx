import React, { useState, useEffect } from "react";
import { auth, db } from "../firebase";
import { RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { X, Loader2, Phone } from "lucide-react";
import { useAuth } from "../App";

export default function LoginModal() {
  const { showLoginModal, setShowLoginModal } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (showLoginModal && !(window as any).recaptchaVerifier) {
      try {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, "recaptcha-container", {
          size: "invisible",
        });
      } catch (err) {
        console.error("Recaptcha init error", err);
      }
    }
  }, [showLoginModal]);

  const resetState = () => {
    setPhoneNumber("");
    setVerificationCode("");
    setConfirmationResult(null);
    setError("");
    setLoading(false);
  };

  const handleClose = () => {
    setShowLoginModal(false);
    resetState();
  };

  if (!showLoginModal) return null;

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber) return;
    
    setLoading(true);
    setError("");
    
    try {
      const appVerifier = (window as any).recaptchaVerifier;
      let formattedPhone = phoneNumber.trim();
      if (!formattedPhone.startsWith("+")) {
        formattedPhone = "+91" + formattedPhone;
      }
      
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
    } catch (err: any) {
      setError(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult || !verificationCode) return;
    
    setLoading(true);
    setError("");
    
    try {
      const result = await confirmationResult.confirm(verificationCode);
      const user = result.user;
      
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          uid: user.uid,
          displayName: "User " + user.uid.slice(0, 5),
          phone: user.phoneNumber,
          isVerified: true,
          createdAt: new Date().toISOString()
        });
      }
      handleClose();
    } catch (err: any) {
      setError(err.message || "Invalid code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
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
                 <Phone className="w-8 h-8 text-teal-600" />
             </div>
          </div>
          
          <h2 className="text-2xl font-bold text-center text-teal-900 mb-2">
            Welcome to InstaNext
          </h2>
          <p className="text-center text-stone-500 mb-8">
            {confirmationResult ? "Enter the verification code sent to your phone" : "Log in or sign up with your phone number"}
          </p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg text-center">
              {error}
            </div>
          )}

          {!confirmationResult ? (
            <form onSubmit={handleSendCode}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-stone-500">+91</span>
                  <input
                    type="tel"
                    required
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value)}
                    placeholder="9876543210"
                    className="w-full pl-12 pr-4 py-2 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading || !phoneNumber}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send Code"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyCode}>
              <div className="mb-6">
                <label className="block text-sm font-medium text-stone-700 mb-2">Verification Code</label>
                <input
                  type="text"
                  required
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  placeholder="123456"
                  maxLength={6}
                  className="w-full px-4 py-3 border border-stone-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition-all text-center tracking-[0.5em] text-lg"
                />
              </div>
              <button
                type="submit"
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center disabled:opacity-70"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify & Login"}
              </button>
            </form>
          )}
        </div>
      </div>
      <div id="recaptcha-container"></div>
    </div>
  );
}
