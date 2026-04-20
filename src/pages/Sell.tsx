import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../App";
import { Camera, Upload, Loader2, ShieldCheck, AlertCircle, Scissors } from "lucide-react";
import { motion } from "framer-motion";
import { GoogleGenAI } from "@google/genai";
import { OperationType, handleFirestoreError } from "../firebase";
import { removeBackground } from "@imgly/background-removal";
import LocationSelector from "../components/LocationSelector";

let aiInstance: GoogleGenAI | null = null;
const getAI = () => {
  if (!aiInstance) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is missing. Image moderation will be skipped.");
      return null;
    }
    aiInstance = new GoogleGenAI({ apiKey: key });
  }
  return aiInstance;
};

export default function Sell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    price: "",
    category: "Electronics",
    condition: "Used",
    state: "",
    district: "",
    city: "",
    area: ""
  });

  const compressImage = async (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context not available");

        // Set dimensions (max 1200px)
        let width = img.width;
        let height = img.height;
        const maxDim = 1200;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }

        canvas.width = width;
        canvas.height = height;

        // Fill white background for JPG
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        // Iteratively compress to get under 100kb
        let quality = 0.9;
        const attemptCompression = () => {
          const base64 = canvas.toDataURL("image/jpeg", quality);
          const size = Math.round((base64.length * 3) / 4) / 1024; // approx size in kb

          if (size < 100 || quality < 0.1) {
            resolve(base64);
          } else {
            quality -= 0.1;
            attemptCompression();
          }
        };

        attemptCompression();
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProcessing(true);
    setError(null);
    setPreview(null);

    try {
      // 1. Remove background
      const processedBlob = await removeBackground(file, {
        progress: (status, progress) => {
          console.log(`Background removal: ${status} ${Math.round(progress * 100)}%`);
        }
      });

      // 2. Convert to JPG and compress < 100kb
      const compressedBase64 = await compressImage(processedBlob);
      setPreview(compressedBase64);
      
      // 3. Moderate image using Gemini
      const ai = getAI();
      if (!ai) {
        setProcessing(false);
        return;
      }

      setModerating(true);
      try {
        const model = "gemini-3-flash-preview";
        const result = await ai.models.generateContent({
          model,
          contents: [
            {
              parts: [
                { inlineData: { data: compressedBase64.split(",")[1], mimeType: "image/jpeg" } },
                { text: "Analyze this image for a marketplace listing. Is it a clear photo of a product? Reject if it contains faces, blurred objects, text only, or inappropriate content. Respond with 'SAFE' or 'REJECT: [reason]'." }
              ]
            }
          ]
        });

        const response = result.text;
        if (response?.includes("REJECT")) {
          setError(response);
          setPreview(null);
        }
      } catch (err) {
        console.error("Moderation error", err);
      } finally {
        setModerating(false);
      }
    } catch (err) {
      console.error("Image processing error", err);
      setError("Failed to process image. Please try a different photo.");
    } finally {
      setProcessing(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to post a listing.");
      return;
    }
    if (!preview) {
      setError("Please upload a product photo.");
      return;
    }

    if (!formData.state || !formData.district || !formData.city || !formData.area) {
      setError("Please complete all location fields.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const listingData = {
        sellerId: user.uid,
        title: formData.title,
        description: formData.description,
        price: Number(formData.price),
        category: formData.category,
        condition: formData.condition,
        state: formData.state,
        district: formData.district,
        city: formData.city.trim(),
        area: formData.area.trim(),
        images: [preview],
        location: {
          lat: 0,
          lng: 0,
          address: `${formData.area}, ${formData.city}, ${formData.district}, ${formData.state}`
        },
        isVerified: user.isVerified,
        status: 'active',
        createdAt: new Date().toISOString()
      };

      const docRef = await addDoc(collection(db, "listings"), listingData);
      // Update the doc with its own ID to satisfy security rules if needed, 
      // but better to fix rules. For now, let's just navigate.
      navigate(`/listing/${docRef.id}`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, "listings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="max-w-2xl mx-auto bg-white rounded-3xl shadow-2xl overflow-hidden border border-stone-100"
    >
      <div className="bg-teal-900 p-8 text-white text-center space-y-2">
        <h1 className="text-3xl font-bold">List Your Item</h1>
        <p className="text-teal-200">Our AI moderates images to keep the community safe.</p>
      </div>

      <form onSubmit={handleSubmit} className="p-8 space-y-6">
        {/* Image Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-bold text-stone-700 uppercase tracking-wider">Product Photo</label>
          <div className="relative aspect-video bg-stone-50 border-2 border-dashed border-stone-200 rounded-2xl flex flex-col items-center justify-center overflow-hidden group hover:border-teal-500 transition-colors">
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center space-y-2">
                <Camera className="w-12 h-12 text-stone-300 mx-auto" />
                <p className="text-stone-400 text-sm">Click to upload or drag & drop</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
              required
            />
            {processing && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
                <Scissors className="w-8 h-8 text-teal-600 animate-bounce" />
                <p className="text-teal-900 font-semibold">Removing Background...</p>
              </div>
            )}
            {moderating && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
                <p className="text-teal-900 font-semibold">AI Moderating...</p>
              </div>
            )}
          </div>
          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-stone-700 uppercase tracking-wider">Title</label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full bg-stone-50 border-stone-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              placeholder="e.g. iPhone 13 Pro"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-stone-700 uppercase tracking-wider">Price (₹)</label>
            <input
              type="number"
              required
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className="w-full bg-stone-50 border-stone-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block text-sm font-bold text-stone-700 uppercase tracking-wider">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-stone-50 border-stone-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            >
              <option>Mobiles</option>
              <option>Electronics</option>
              <option>Furniture</option>
              <option>Vehicles</option>
              <option>Books</option>
              <option>Fashion</option>
              <option>Other</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-bold text-stone-700 uppercase tracking-wider">Condition</label>
            <select
              value={formData.condition}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
              className="w-full bg-stone-50 border-stone-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            >
              <option>Brand New</option>
              <option>Like New</option>
              <option>Used</option>
              <option>Heavily Used</option>
            </select>
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-bold text-stone-700 uppercase tracking-wider">Description</label>
          <textarea
            required
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full bg-stone-50 border-stone-200 rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all"
            placeholder="Tell buyers about your item..."
          />
        </div>

        <div className="space-y-2">
          <LocationSelector
            state={formData.state} setState={(val) => setFormData(p => ({ ...p, state: val }))}
            district={formData.district} setDistrict={(val) => setFormData(p => ({ ...p, district: val }))}
            city={formData.city} setCity={(val) => setFormData(p => ({ ...p, city: val }))}
            area={formData.area} setArea={(val) => setFormData(p => ({ ...p, area: val }))}
            standalone={true}
          />
        </div>

        <button
          type="submit"
          disabled={loading || moderating || !!error}
          className="w-full bg-gold-500 text-teal-900 py-4 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-gold-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
          <span>{loading ? "Publishing..." : "Post Listing"}</span>
        </button>
      </form>
    </motion.div>
  );
}
