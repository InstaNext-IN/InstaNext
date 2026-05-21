import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../App";
import { Camera, Upload, Loader2, ShieldCheck, AlertCircle, Scissors } from "lucide-react";
import { motion } from "framer-motion";
import imageCompression from "browser-image-compression";
import { removeBackground } from "@imgly/background-removal";
import { GoogleGenAI } from "@google/genai";
import { OperationType, handleFirestoreError } from "../firebase";
import LocationSelector from "../components/LocationSelector";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export default function Sell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [moderating, setModerating] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emptyFields, setEmptyFields] = useState<string[]>([]);
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
    // Fill white background for JPG first since background removal leaves it transparent
    const fileWithWhiteBg = await new Promise<File>((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject("Canvas context not available");

        canvas.width = img.width;
        canvas.height = img.height;

        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((b) => {
          if (b) resolve(new File([b], "image.jpg", { type: "image/jpeg" }));
          else reject("Failed to create blob");
        }, "image/jpeg", 1.0);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(blob);
    });

    const options = {
      maxSizeMB: 0.098, // just under 100kb
      maxWidthOrHeight: 1280, // resize larger images to preserve quality over raw compression
      useWebWorker: true,
      fileType: "image/jpeg"
    };

    try {
      const compressedFile = await imageCompression(fileWithWhiteBg, options);
      return await imageCompression.getDataUrlFromFile(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      throw error;
    }
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
      setModerating(true);
      try {
        const result = await ai.models.generateContent({
          model: "gemini-3-flash-preview",
          contents: {
            parts: [
              {
                inlineData: {
                  data: compressedBase64.split(",")[1],
                  mimeType: "image/jpeg"
                }
              },
              {
                text: "Analyze this image. You are a content moderator for a family-friendly marketplace. Strictly reject any images containing: 1. Nudity or sexually suggestive content. 2. Violence or disturbing/gory imagery. 3. Offensive symbols or hate speech. 4. Generic faces or people. 5. Obvious junk/blur. If safe and a clear product, respond ONLY with 'SAFE'. Otherwise respond with 'REJECT: [reason]'."
              }
            ]
          }
        });
        
        const responseText = result.text;
        
        if (responseText?.includes("REJECT")) {
          setError(responseText);
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
    
    // Validate fields
    const missing: string[] = [];
    if (!preview) missing.push("photo");
    if (!formData.title.trim()) missing.push("title");
    if (!formData.price.toString().trim()) missing.push("price");
    if (!formData.description.trim()) missing.push("description");
    if (!formData.state) missing.push("state");
    if (!formData.district) missing.push("district");
    if (!formData.city.trim()) missing.push("city");
    if (!formData.area.trim()) missing.push("area");

    setEmptyFields(missing);

    if (missing.length > 0) {
      setError("Please fill out all missing fields highlighted in red.");
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
        status: 'pending',
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
          <label className={`block text-sm font-bold uppercase tracking-wider ${emptyFields.includes('photo') ? 'text-red-500' : 'text-stone-700'}`}>Product Photo</label>
          <div className={`relative aspect-video bg-stone-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center overflow-hidden group hover:border-teal-500 transition-colors ${emptyFields.includes('photo') ? 'border-red-500' : 'border-stone-200'}`}>
            {preview ? (
              <img src={preview} alt="Preview" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center space-y-2">
                <Camera className={`w-12 h-12 mx-auto ${emptyFields.includes('photo') ? 'text-red-300' : 'text-stone-300'}`} />
                <p className={`text-sm ${emptyFields.includes('photo') ? 'text-red-400' : 'text-stone-400'}`}>Click to upload or drag & drop</p>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="absolute inset-0 opacity-0 cursor-pointer"
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
            <label className={`block text-sm font-bold uppercase tracking-wider ${emptyFields.includes('title') ? 'text-red-500' : 'text-stone-700'}`}>Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className={`w-full bg-stone-50 border rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all ${emptyFields.includes('title') ? 'border-red-500' : 'border-stone-200'}`}
              placeholder="e.g. iPhone 13 Pro"
            />
          </div>
          <div className="space-y-2">
            <label className={`block text-sm font-bold uppercase tracking-wider ${emptyFields.includes('price') ? 'text-red-500' : 'text-stone-700'}`}>Price (₹)</label>
            <input
              type="number"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: e.target.value })}
              className={`w-full bg-stone-50 border rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all ${emptyFields.includes('price') ? 'border-red-500' : 'border-stone-200'}`}
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
          <label className={`block text-sm font-bold uppercase tracking-wider ${emptyFields.includes('description') ? 'text-red-500' : 'text-stone-700'}`}>Description</label>
          <textarea
            rows={4}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className={`w-full bg-stone-50 border rounded-xl py-3 px-4 focus:ring-2 focus:ring-teal-500 outline-none transition-all ${emptyFields.includes('description') ? 'border-red-500' : 'border-stone-200'}`}
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
            errors={emptyFields}
          />
        </div>

        <button
          type="submit"
          disabled={loading || moderating || processing}
          className="w-full bg-gold-500 text-teal-900 py-4 rounded-2xl font-black text-lg uppercase tracking-widest hover:bg-gold-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
        >
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6" />}
          <span>{loading ? "Publishing..." : "Post Listing"}</span>
        </button>
      </form>
    </motion.div>
  );
}
