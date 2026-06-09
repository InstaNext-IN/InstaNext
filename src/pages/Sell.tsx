import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, doc, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../App";
import { Camera, Upload, Loader2, ShieldCheck, AlertCircle, Scissors, X } from "lucide-react";
import { motion } from "framer-motion";
import imageCompression from "browser-image-compression";
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
  const [previews, setPreviews] = useState<string[]>([]);

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

  React.useEffect(() => {
    if (navigator.geolocation) {
      setLoading(true);
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            const data = await res.json();
            const address = data.address;
            setFormData(p => ({
              ...p,
              state: address.state || address.region || "",
              district: address.state_district || address.county || address.district || "",
              city: address.city || address.town || address.village || address.county || "",
              area: address.suburb || address.neighbourhood || address.county || ""
            }));
          } catch (e) {
            console.error(e);
            setError("Failed to fetch location. Please ensure you have internet connection.");
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.error(error);
          setLoading(false);
          setError("Location access denied. Please enable location to post an ad.");
        }
      );
    } else {
      setError("Geolocation is not supported by your browser.");
    }
  }, []);

  const compressImage = async (blob: File): Promise<string> => {
    const options = {
      maxSizeMB: 0.098, // just under 100kb
      maxWidthOrHeight: 1280, // resize larger images to preserve quality over raw compression
      useWebWorker: true,
      fileType: "image/jpeg"
    };

    try {
      const compressedFile = await imageCompression(blob, options);
      return await imageCompression.getDataUrlFromFile(compressedFile);
    } catch (error) {
      console.error("Compression error:", error);
      throw error;
    }
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    if (previews.length + files.length > 5) {
      setError("You can only upload up to 5 images.");
      return;
    }

    setProcessing(true);
    setError(null);

    const newPreviews: string[] = [];

    try {
      for (const file of files) {
        // Convert to JPG and compress < 100kb
        const compressedBase64 = await compressImage(file);
        
        // Moderate image using Gemini
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
            setError(`Image ${file.name} rejected: ${responseText}`);
            // Skip this image
            continue;
          } else {
            newPreviews.push(compressedBase64);
          }
        } catch (err) {
          console.error(`Moderation error for ${file.name}`, err);
          setError(`Moderation failed for ${file.name}`);
        } finally {
          setModerating(false);
        }
      }

      setPreviews(prev => [...prev, ...newPreviews]);
    } catch (err) {
      console.error("Image processing error", err);
      setError("Failed to process some images. Please try different photos.");
    } finally {
      setProcessing(false);
      e.target.value = "";
    }
  };

  const removeImage = (index: number) => {
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError("You must be logged in to post a listing.");
      return;
    }
    
    // Validate fields
    const missing: string[] = [];
    if (previews.length === 0) missing.push("photo");
    if (!formData.title.trim()) missing.push("title");
    if (!formData.price.toString().trim()) missing.push("price");
    if (!formData.description.trim()) missing.push("description");
    if (!formData.state) missing.push("state");
    if (!formData.district) missing.push("district");
    if (!formData.city.trim()) missing.push("city");

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
        images: previews,
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
        <div className="space-y-4">
          <label className={`block text-sm font-bold uppercase tracking-wider ${emptyFields.includes('photo') ? 'text-red-500' : 'text-stone-700'}`}>Product Photos (up to 5)</label>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {previews.map((preview, index) => (
              <div key={index} className="relative aspect-square rounded-2xl overflow-hidden border border-stone-200 group">
                <img src={preview} alt={`Preview ${index}`} className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(index)}
                  className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full shadow-sm hover:bg-red-50 text-stone-700 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
            
            {previews.length < 5 && (
              <div className={`relative aspect-square bg-stone-50 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center overflow-hidden group hover:border-teal-500 transition-colors ${(emptyFields.includes('photo') && previews.length === 0) ? 'border-red-500' : 'border-stone-200'}`}>
                <div className="text-center space-y-2 p-4">
                  <Camera className={`w-8 h-8 mx-auto ${(emptyFields.includes('photo') && previews.length === 0) ? 'text-red-300' : 'text-stone-300'}`} />
                  <p className={`text-xs font-medium ${(emptyFields.includes('photo') && previews.length === 0) ? 'text-red-400' : 'text-stone-500'}`}>Add Photo</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleImageChange}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                />
                {(processing || moderating) && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
                    <Loader2 className="w-6 h-6 text-teal-600 animate-spin" />
                    <p className="text-teal-900 font-semibold text-xs text-center px-2">{moderating ? "Checking..." : "Processing..."}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center space-x-2 text-red-600 bg-red-50 p-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
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
              <option>Properties</option>
              <option>Mobiles</option>
              <option>Electronics</option>
              <option>Furniture</option>
              <option>Vehicles</option>
              <option>Books</option>
              <option>Fashion</option>
              <option>Toys & Games</option>
              <option>Pet Supplies</option>
              <option>Sports & Outdoors</option>
              <option>Home & Garden</option>
              <option>Beauty & Personal Care</option>
              <option>Health & Fitness</option>
              <option>Tools & Home Improvement</option>
              <option>Arts & Crafts</option>
              <option>Musical Instruments</option>
              <option>Office Supplies</option>
              <option>Industrial & Scientific</option>
              <option>Antiques & Collectibles</option>
              <option>Real Estate</option>
              <option>Services</option>
              <option>Jobs</option>
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
            disabled={true}
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
