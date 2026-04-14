import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp, updateDoc, arrayUnion, arrayRemove, collection, addDoc, query, where, limit } from "firebase/firestore";
import { db, signInWithGoogle } from "../firebase";
import { Listing, User } from "../types";
import { useAuth } from "../App";
import { BadgeCheck, MapPin, MessageCircle, Shield, AlertTriangle, Loader2, Share2, Flag, Heart, TrendingDown, Star, Tag } from "lucide-react";
import { motion } from "framer-motion";
import { OperationType, handleFirestoreError } from "../firebase";
import { Link } from "react-router-dom";
import ListingCard from "../components/ListingCard";

export default function ListingDetail() {
  const { id } = useParams();
  const { user: currentUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [favLoading, setFavLoading] = useState(false);
  const [reportLoading, setReportLoading] = useState(false);
  const [isEditingPrice, setIsEditingPrice] = useState(false);
  const [newPrice, setNewPrice] = useState("");
  const [similarListings, setSimilarListings] = useState<Listing[]>([]);
  const navigate = useNavigate();

  const isFavorited = currentUser?.favorites?.includes(listing?.id || "");

  const toggleFavorite = async () => {
    if (!currentUser || !listing) {
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

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing?.title,
          text: `Check out this ${listing?.title} on Second Innings!`,
          url: url,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(url);
      alert("Link copied to clipboard!");
    }
  };

  const handleReport = async () => {
    if (!currentUser) {
      await signInWithGoogle();
      return;
    }
    const reason = prompt("Why are you reporting this listing?");
    if (!reason) return;
    
    setReportLoading(true);
    try {
      await addDoc(collection(db, "reports"), {
        listingId: listing?.id,
        reporterId: currentUser.uid,
        reason,
        createdAt: serverTimestamp()
      });
      alert("Report submitted successfully. Our team will review it.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "reports");
    } finally {
      setReportLoading(false);
    }
  };

  const markAsSold = async () => {
    if (!listing || currentUser?.uid !== listing.sellerId) return;
    if (!confirm("Are you sure you want to mark this item as sold?")) return;
    try {
      await updateDoc(doc(db, "listings", listing.id), { status: 'sold' });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "listings");
    }
  };

  const deleteListing = async () => {
    if (!listing || currentUser?.uid !== listing.sellerId) return;
    if (!confirm("Are you sure you want to delete this listing? This action cannot be undone.")) return;
    try {
      // Note: In a real app, you'd also want to delete the images from storage
      await updateDoc(doc(db, "listings", listing.id), { status: 'deleted' }); // Soft delete for simplicity, or deleteDoc
      navigate('/profile');
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "listings");
    }
  };

  const updatePrice = async () => {
    if (!listing || currentUser?.uid !== listing.sellerId) return;
    const priceNum = Number(newPrice);
    if (isNaN(priceNum) || priceNum <= 0) return;
    
    try {
      await updateDoc(doc(db, "listings", listing.id), {
        price: priceNum,
        originalPrice: listing.price > priceNum ? listing.price : listing.originalPrice
      });
      setIsEditingPrice(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "listings");
    }
  };

  useEffect(() => {
    if (!id) return;
    const listingRef = doc(db, "listings", id);
    const unsubscribe = onSnapshot(listingRef, async (docSnap) => {
      if (docSnap.exists()) {
        const listingData = { id: docSnap.id, ...docSnap.data() } as Listing;
        setListing(listingData);
        
        // Fetch seller info
        const sellerRef = doc(db, "users", listingData.sellerId);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          setSeller(sellerSnap.data() as User);
        }

        // Fetch similar items
        const qSimilar = query(
          collection(db, "listings"), 
          where("category", "==", listingData.category),
          limit(5)
        );
        const similarSnap = await getDoc(sellerRef); // Just to trigger, we'll use onSnapshot for similar
        onSnapshot(qSimilar, (snap) => {
          const similarData = snap.docs
            .map(d => ({ id: d.id, ...d.data() } as Listing))
            .filter(l => l.id !== listingData.id && l.status !== 'deleted' && l.status !== 'sold');
          setSimilarListings(similarData.slice(0, 4));
        });
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `listings/${id}`);
    });

    return () => unsubscribe();
  }, [id]);

  const startChat = async () => {
    if (!currentUser || !listing) return;
    setChatLoading(true);
    try {
      const chatId = [currentUser.uid, listing.sellerId].sort().join("_");
      const chatRef = doc(db, "chats", chatId);
      const chatSnap = await getDoc(chatRef);

      if (!chatSnap.exists()) {
        await setDoc(chatRef, {
          participants: [currentUser.uid, listing.sellerId],
          listingId: id,
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

  if (loading) return <div className="h-96 bg-stone-100 rounded-2xl animate-pulse" />;
  if (!listing) return <div className="text-center py-20">Listing not found</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-2 gap-12"
    >
      {/* Images */}
      <div className="space-y-4">
        <div className="aspect-square bg-white rounded-3xl overflow-hidden shadow-xl border border-stone-100 relative">
          <img
            src={listing.images[0] || "https://picsum.photos/seed/product/800/800"}
            alt={listing.title}
            className={`w-full h-full object-cover ${listing.status === 'sold' ? 'grayscale opacity-70' : ''}`}
            referrerPolicy="no-referrer"
          />
          {listing.status === 'sold' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <span className="bg-red-600 text-white px-6 py-3 rounded-xl font-black text-3xl tracking-widest rotate-[-12deg] shadow-2xl border-4 border-red-700">
                SOLD
              </span>
            </div>
          )}
          <div className="absolute top-4 right-4 flex flex-col space-y-2">
            <button
              onClick={toggleFavorite}
              disabled={favLoading}
              className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <Heart className={`w-6 h-6 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-stone-500'}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-3 bg-white/90 backdrop-blur-md rounded-full shadow-lg hover:bg-white transition-colors"
            >
              <Share2 className="w-6 h-6 text-stone-500" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {listing.images.slice(1).map((img, i) => (
            <div key={i} className="aspect-square bg-white rounded-xl overflow-hidden shadow-md border border-stone-100">
              <img src={img} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="space-y-8">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="bg-teal-100 text-teal-800 px-3 py-1 rounded-full font-semibold uppercase tracking-wider text-xs">{listing.category}</span>
              {listing.condition && (
                <span className="bg-stone-100 text-stone-600 px-3 py-1 rounded-full font-semibold uppercase tracking-wider text-xs flex items-center">
                  <Tag className="w-3 h-3 mr-1" />
                  {listing.condition}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-stone-400 text-sm">{new Date(listing.createdAt).toLocaleDateString()}</span>
              <button onClick={handleReport} disabled={reportLoading} className="text-stone-400 hover:text-red-500 transition-colors flex items-center text-sm">
                <Flag className="w-4 h-4 mr-1" />
                Report
              </button>
            </div>
          </div>
          <h1 className="text-4xl font-bold text-stone-900">{listing.title}</h1>
          
          <div className="flex items-end space-x-4">
            {isEditingPrice ? (
              <div className="flex items-center space-x-2">
                <span className="text-3xl font-black text-teal-900">₹</span>
                <input
                  type="number"
                  value={newPrice}
                  onChange={(e) => setNewPrice(e.target.value)}
                  className="text-3xl font-black text-teal-900 bg-stone-100 rounded-lg px-2 py-1 w-32 outline-none"
                  autoFocus
                />
                <button onClick={updatePrice} className="bg-teal-600 text-white px-3 py-1 rounded-lg text-sm font-bold">Save</button>
                <button onClick={() => setIsEditingPrice(false)} className="text-stone-500 text-sm">Cancel</button>
              </div>
            ) : (
              <div className="text-5xl font-black text-teal-900">₹{listing.price}</div>
            )}
            
            {listing.originalPrice && listing.originalPrice > listing.price && (
              <div className="flex flex-col mb-1">
                <span className="text-lg text-stone-400 line-through">₹{listing.originalPrice}</span>
                <span className="text-sm font-bold text-green-600 flex items-center">
                  <TrendingDown className="w-4 h-4 mr-1" />
                  Price Dropped
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center text-stone-500">
            <MapPin className="w-5 h-5 mr-2 text-gold-500" />
            <span>{listing.city ? `${listing.location.address}, ${listing.city}` : listing.location.address}</span>
          </div>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-100 space-y-4">
          <h3 className="font-semibold text-lg">Description</h3>
          <p className="text-stone-600 leading-relaxed">{listing.description}</p>
        </div>

        <div className="p-6 bg-white rounded-2xl shadow-sm border border-stone-100 space-y-4">
          <h3 className="font-semibold text-lg flex items-center">
            <MapPin className="w-5 h-5 mr-2 text-gold-500" />
            Approximate Location
          </h3>
          <p className="text-stone-600 mb-2">{listing.location.address}</p>
          <div className="w-full h-48 bg-stone-100 rounded-xl overflow-hidden border border-stone-200">
            <iframe
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              marginHeight={0}
              marginWidth={0}
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${listing.location.lng - 0.02},${listing.location.lat - 0.02},${listing.location.lng + 0.02},${listing.location.lat + 0.02}&layer=mapnik&marker=${listing.location.lat},${listing.location.lng}`}
            ></iframe>
          </div>
        </div>

        {/* Seller Info & Chat */}
        <div className="p-6 bg-teal-900 text-white rounded-2xl shadow-xl space-y-6">
          {seller ? (
            <div className="flex items-center justify-between">
              <Link to={`/seller/${seller.uid}`} className="flex items-center space-x-4 group">
                <img src={seller.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller.uid}`} alt="" className="w-16 h-16 rounded-full border-2 border-gold-500 group-hover:scale-105 transition-transform" />
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-xl group-hover:underline">{seller.displayName}</h3>
                    {seller.isVerified && (
                      <BadgeCheck className="w-5 h-5 text-gold-500" />
                    )}
                  </div>
                  <div className="flex items-center space-x-2 mt-1">
                    <div className="flex items-center text-gold-400">
                      <Star className="w-4 h-4 fill-current" />
                      <span className="ml-1 font-bold text-white">{seller.rating || "New"}</span>
                    </div>
                    <span className="text-teal-200 text-sm">• Member since {new Date(seller.createdAt).getFullYear()}</span>
                  </div>
                </div>
              </Link>
            </div>
          ) : (
            <div className="flex items-center space-x-4 animate-pulse">
              <div className="w-16 h-16 bg-teal-800 rounded-full" />
              <div className="space-y-2">
                <div className="h-4 w-32 bg-teal-800 rounded" />
                <div className="h-3 w-24 bg-teal-800 rounded" />
              </div>
            </div>
          )}

          {currentUser?.uid === listing.sellerId ? (
            <div className="grid grid-cols-3 gap-4">
              <button
                onClick={() => {
                  setNewPrice(listing.price.toString());
                  setIsEditingPrice(true);
                }}
                className="w-full bg-teal-800 text-white px-4 py-4 rounded-xl font-bold hover:bg-teal-700 transition-colors text-sm"
              >
                Edit Price
              </button>
              <button
                onClick={markAsSold}
                disabled={listing.status === 'sold'}
                className="w-full bg-gold-500 text-teal-900 px-4 py-4 rounded-xl font-bold hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {listing.status === 'sold' ? 'Sold Out' : 'Mark as Sold'}
              </button>
              <button
                onClick={deleteListing}
                className="w-full bg-red-100 text-red-700 px-4 py-4 rounded-xl font-bold hover:bg-red-200 transition-colors text-sm"
              >
                Delete
              </button>
            </div>
          ) : listing.status !== 'sold' ? (
            <button
              onClick={() => {
                if (!currentUser) {
                  signInWithGoogle().then(() => startChat());
                } else {
                  startChat();
                }
              }}
              disabled={chatLoading}
              className="w-full bg-gold-500 text-teal-900 px-6 py-4 rounded-full font-black uppercase tracking-widest hover:bg-gold-600 transition-all flex items-center justify-center space-x-3 shadow-lg disabled:opacity-50 group"
            >
              {chatLoading ? (
                <Loader2 className="w-6 h-6 animate-spin" />
              ) : (
                <MessageCircle className="w-6 h-6 group-hover:scale-110 transition-transform" />
              )}
              <span>{chatLoading ? "Starting Chat..." : "Chat with Seller"}</span>
            </button>
          ) : (
            <div className="w-full bg-stone-800 text-white px-6 py-4 rounded-full font-black uppercase tracking-widest text-center opacity-70">
              Item Sold
            </div>
          )}
        </div>

        {/* Safety Banner */}
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-2xl flex items-start space-x-4">
          <Shield className="w-6 h-6 text-amber-600 flex-shrink-0" />
          <div className="space-y-1">
            <h4 className="font-bold text-amber-900">Safety First</h4>
            <p className="text-amber-700 text-sm">
              Always meet in bright, public places. Suggesting a police station or a mall is a great idea. Never pay before seeing the item.
            </p>
          </div>
        </div>
      </div>

      {/* Similar Items */}
      {similarListings.length > 0 && (
        <div className="col-span-1 lg:col-span-2 pt-12 border-t border-stone-200 mt-12">
          <h2 className="text-2xl font-bold text-stone-900 mb-6">Similar Items</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {similarListings.map(item => (
              <ListingCard key={item.id} listing={item} />
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
