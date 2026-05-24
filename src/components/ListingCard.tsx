import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Listing } from "../types";
import { MapPin, MessageCircle, Loader2, Heart, TrendingDown, Tag, RotateCw, Share2 } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "../App";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove } from "firebase/firestore";

export default function ListingCard({ listing }: { listing: Listing }) {
  const { user: currentUser, setShowLoginModal } = useAuth();
  const navigate = useNavigate();
  const [chatLoading, setChatLoading] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [repostLoading, setRepostLoading] = useState(false);

  const isFavorited = currentUser?.favorites?.includes(listing.id);
  const thirtyDaysAgo = new Date().getTime() - 30 * 24 * 60 * 60 * 1000;
  const isExpired = new Date(listing.createdAt).getTime() <= thirtyDaysAgo;
  const isOwner = currentUser?.uid === listing.sellerId;

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!currentUser) {
      setShowLoginModal(true);
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

  const handleRepost = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setRepostLoading(true);
    try {
      const listingRef = doc(db, "listings", listing.id);
      await updateDoc(listingRef, {
        createdAt: new Date().toISOString()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "listings");
    } finally {
      setRepostLoading(false);
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
      setShowLoginModal(true);
    } else {
      initiate();
    }
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      className={`bg-white rounded-2xl shadow-sm border ${isExpired ? 'border-red-200' : 'border-stone-100'} overflow-hidden group flex flex-col h-full relative`}
    >
      <Link to={`/listing/${listing.id}`} className="absolute inset-0 z-0" aria-label={`View details of ${listing.title}`} />
      
      <div className="flex-1 flex flex-col relative pointer-events-none">
        <div className="relative aspect-square overflow-hidden bg-stone-100">
          <img
            src={listing.images[0] || "https://picsum.photos/seed/product/400/400"}
            alt={listing.title}
            className={`w-full h-full object-contain bg-stone-100 transition-transform duration-500 group-hover:scale-110 ${(listing.status === 'sold' || isExpired) ? 'grayscale opacity-70' : ''}`}
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
          />
          {listing.status === 'sold' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg tracking-widest rotate-[-12deg] shadow-xl">
                SOLD
              </span>
            </div>
          )}
          {isExpired && listing.status !== 'sold' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30">
              <span className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold text-lg tracking-widest shadow-xl">
                EXPIRED
              </span>
            </div>
          )}

          <button
            onClick={toggleFavorite}
            disabled={favLoading}
            className="absolute top-3 left-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors pointer-events-auto z-10"
          >
            <Heart className={`w-4 h-4 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-stone-500'}`} />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const url = `${window.location.origin}/listing/${listing.id}`;
              if (navigator.share) {
                navigator.share({
                  title: listing.title,
                  text: `Check out this ${listing.title} on Second Innings!`,
                  url: url,
                }).catch(console.error);
              } else {
                navigator.clipboard.writeText(url);
                alert("Link copied to clipboard!");
              }
            }}
            className="absolute top-3 right-3 p-2 bg-white/80 backdrop-blur-sm rounded-full shadow-sm hover:bg-white transition-colors pointer-events-auto z-10"
          >
            <Share2 className="w-4 h-4 text-stone-500" />
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
      </div>
      
      {isOwner && isExpired && listing.status !== 'sold' && (
        <div className="p-4 pt-0 relative z-10 pointer-events-auto">
          <button
            onClick={handleRepost}
            disabled={repostLoading}
            className="w-full bg-gold-500 text-teal-900 py-2 rounded-xl font-bold text-sm flex items-center justify-center space-x-2 hover:bg-gold-600 transition-colors disabled:opacity-50"
          >
            {repostLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RotateCw className="w-4 h-4" />
            )}
            <span>{repostLoading ? "Reposting..." : "Repost AD"}</span>
          </button>
        </div>
      )}
      
      {!isOwner && listing.status !== 'sold' && !isExpired && (
        <div className="p-4 pt-0 relative z-10 pointer-events-auto">
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
