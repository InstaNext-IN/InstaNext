import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { db, OperationType, handleFirestoreError } from "../firebase";
import { User, Listing } from "../types";
import { BadgeCheck, Star, User as UserIcon, Loader2, Package } from "lucide-react";
import { motion } from "framer-motion";
import ListingCard from "../components/ListingCard";

export default function SellerProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<User | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    const fetchSeller = async () => {
      try {
        const sellerRef = doc(db, "users", id);
        const sellerSnap = await getDoc(sellerRef);
        if (sellerSnap.exists()) {
          setSeller(sellerSnap.data() as User);
        }
      } catch (error) {
        handleFirestoreError(error, OperationType.GET, `users/${id}`);
      } finally {
        setLoading(false);
      }
    };

    fetchSeller();

    const qListings = query(collection(db, "listings"), where("sellerId", "==", id));
    const unsubscribeListings = onSnapshot(qListings, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      setListings(data.filter(l => l.status !== 'deleted'));
      setListingsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "listings");
    });

    return () => unsubscribeListings();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!seller) {
    return (
      <div className="text-center py-20 space-y-4">
        <UserIcon className="w-16 h-16 text-stone-300 mx-auto" />
        <h2 className="text-2xl font-semibold text-stone-600">Seller not found</h2>
        <button onClick={() => navigate("/")} className="text-teal-600 hover:underline">Return Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Seller Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-teal-900 text-white rounded-3xl shadow-xl p-8 flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8 relative overflow-hidden"
      >
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-500 via-transparent to-transparent" />
        
        <div className="relative z-10">
          <img
            src={seller.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${seller.uid}`}
            alt=""
            className="w-32 h-32 rounded-full border-4 border-gold-500 shadow-xl bg-white"
          />
          {seller.isVerified && (
            <div className="absolute bottom-0 right-0 bg-gold-500 p-2 rounded-full shadow-lg">
              <BadgeCheck className="w-6 h-6 text-teal-900" />
            </div>
          )}
        </div>
        
        <div className="relative z-10 text-center md:text-left flex-1">
          <h1 className="text-4xl font-bold text-white flex items-center justify-center md:justify-start space-x-2">
            <span>{seller.displayName}</span>
          </h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-4">
            <div className="flex items-center space-x-2 bg-teal-800/50 px-4 py-2 rounded-full text-sm font-semibold">
              <UserIcon className="w-4 h-4 text-teal-300" />
              <span>Member since {new Date(seller.createdAt).getFullYear()}</span>
            </div>
            <div className="flex items-center space-x-2 bg-teal-800/50 px-4 py-2 rounded-full text-sm font-semibold">
              <Star className="w-4 h-4 text-gold-400 fill-current" />
              <span>{seller.rating ? `${seller.rating} Rating` : "New Seller"}</span>
            </div>
            <div className="flex items-center space-x-2 bg-teal-800/50 px-4 py-2 rounded-full text-sm font-semibold">
              <Package className="w-4 h-4 text-teal-300" />
              <span>{listings.length} Active Listings</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Seller's Listings */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="space-y-6"
      >
        <h2 className="text-2xl font-bold text-stone-900">More from {seller.displayName}</h2>
        
        {listingsLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-80 bg-stone-200 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
        ) : (
          <div className="text-center py-20 bg-white rounded-3xl shadow-sm border border-stone-100">
            <Package className="w-16 h-16 text-stone-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-stone-600">No active listings</h3>
            <p className="text-stone-400">This seller doesn't have any items for sale right now.</p>
          </div>
        )}
      </motion.div>
    </div>
  );
}
