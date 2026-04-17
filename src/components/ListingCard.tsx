import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Listing } from "../types";
import { BadgeCheck, MapPin, MessageCircle, Loader2, Heart, TrendingDown, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../App";
import { db, auth, signInWithGoogle, OperationType, handleFirestoreError } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function ListingCard({ listing }: { listing: Listing }) {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [chatLoading, setChatLoading] = useState(false);
  const [favLoading, setFavLoading] = useState(false);

  const isFavorited = currentUser?.favorites?.includes(listing.id);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      await signInWithGoogle();
      return;
    }
    
    setFavLoading(true);
    try {
      const userRef = doc(db, "users", currentUser.uid);
      await updateDoc(userRef, {
        favorites: isFavorited ? arrayRemove(listing.id) : arrayUnion(listing.id)
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    } finally {
      setFavLoading(false);
    }
  };

  const startChat = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const initiate = async () => {
      setChatLoading(true);
      try {
        const chatId = [auth.currentUser!.uid, listing.sellerId].sort().join("_");
        const chatRef = doc(db, "chats", chatId);
        const chatSnap = await getDoc(chatRef);

        if (!chatSnap.exists()) {
          await setDoc(chatRef, {
            participants: [auth.currentUser!.uid, listing.sellerId],
            listingId: listing.id,
            updatedAt: serverTimestamp()
          });
        }
        navigate(`/chat/${chatId}`);
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "chats");
      } finally {
        setChatLoading(false);
      }
    };

    if (!currentUser) {
      signInWithGoogle().then(() => initiate());
    } else {
      initiate();
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden group flex flex-col h-full"
    >
      <Link to={`/listing/${listing.id}`} className="flex-1 flex flex-col relative">
        <div className="relative aspect-square overflow-hidden bg-stone-100">
          <img
            src={listing.images[0] || "https://picsum.photos/seed/product/400/400"}
            alt={listing.title}
            className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-110 ${listing.status === 'sold' ? 'grayscale opacity-70' : ''}`}
            referrerPolicy="no-referrer"
          />
          {listing.status === 'sold' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg tracking-widest rotate-[-12deg] shadow-xl">
                SOLD
              </span>
            </div>
          )}
          {listing.isVerified && (
            <div className="absolute top-3 right-3 bg-gold-500 text-teal-900 px-2 py-1 rounded-full text-xs font-bold flex items-center space-x-1 shadow-md">
              <BadgeCheck className="w-3 h-3" />
              <span>Verified</span>
            </div>
          )}
          <button
            onClick={toggleFavorite}
            disabled={favLoading}
            className="absolute top-3 left-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-stone-500'}`} />
          </button>
        </div>
        <div className="p-4 space-y-2 flex-1 flex flex-col">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-lg text-stone-900 truncate">{listing.title}</h3>
            <div className="flex flex-col items-end">
              <span className="text-xl font-bold text-teal-900">₹{listing.price}</span>
              {listing.originalPrice && listing.originalPrice > listing.price && (
                <span className="text-xs text-stone-400 line-through">₹{listing.originalPrice}</span>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-600 bg-teal-50 px-2 py-1 rounded-md">
              {listing.category}
            </span>
            {listing.condition && (
              <span className="text-xs font-medium text-stone-500 flex items-center">
                <Tag className="w-3 h-3 mr-1" />
                {listing.condition}
              </span>
            )}
          </div>
          {listing.originalPrice && listing.originalPrice > listing.price && (
            <div className="flex items-center text-green-600 text-xs font-medium">
              <TrendingDown className="w-3 h-3 mr-1" />
              Price Dropped
            </div>
          )}
          <div className="flex items-center text-stone-400 text-sm">
            <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
            <span className="truncate">
              {listing.area ? `${listing.area}, ${listing.city}` : listing.city ? `${listing.location.address}, ${listing.city}` : listing.location.address}
            </span>
          </div>
          <p className="text-stone-500 text-sm line-clamp-2 flex-1">{listing.description}</p>
        </div>
      </Link>
      
      {currentUser?.uid !== listing.sellerId && listing.status !== 'sold' && (
        <div className="p-4 pt-0">
          <button
            onClick={startChat}
            disabled={chatLoading}
            className="w-full bg-teal-50 text-teal-700 py-2 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 hover:bg-teal-100 transition-colors disabled:opacity-50"
          >
            {chatLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MessageCircle className="w-4 h-4" />
            )}
            <span>{chatLoading ? "Starting..." : "Chat Now"}</span>
          </button>
        </div>
      )}
    </motion.div>
  );
}
