import React from "react";
import { X, Share, PlusSquare } from "lucide-react";
import { useAuth } from "../App";

export default function IOSInstallModal() {
  const { showIOSInstallPrompt, setShowIOSInstallPrompt } = useAuth();

  if (!showIOSInstallPrompt) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden relative animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:fade-in duration-300">
        <button
          onClick={() => setShowIOSInstallPrompt(false)}
          className="absolute right-4 top-4 p-2 text-stone-400 hover:text-stone-600 hover:bg-stone-100 rounded-full transition-colors z-10"
        >
          <X className="w-6 h-6" />
        </button>
        
        <div className="p-8 text-center">
          <div className="flex justify-center mb-6">
            <div className="w-20 h-20 bg-teal-50 rounded-2xl flex items-center justify-center shadow-inner">
               <span className="text-teal-900 font-bold text-3xl italic">.IN</span>
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-stone-900 mb-2">
            Install Insta Next
          </h2>
          <p className="text-stone-500 mb-8">
            Add this app to your home screen for quick access and a better experience.
          </p>

          <div className="space-y-6 text-left bg-stone-50 p-6 rounded-2xl border border-stone-100">
            <div className="flex items-center space-x-4">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <Share className="w-6 h-6 text-blue-500" />
              </div>
              <p className="text-stone-700 font-medium text-sm">
                1. Tap the <span className="font-bold text-stone-900">Share</span> button at the bottom of your screen.
              </p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="bg-white p-2 rounded-xl shadow-sm">
                <PlusSquare className="w-6 h-6 text-stone-600" />
              </div>
              <p className="text-stone-700 font-medium text-sm">
                2. Tap <span className="font-bold text-stone-900">Add to Home Screen</span>.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
