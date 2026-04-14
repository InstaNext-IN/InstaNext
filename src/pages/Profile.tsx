import React, { useState, useEffect } from "react";
import { useAuth } from "../App";
import { auth, db, OperationType, handleFirestoreError } from "../firebase";
import { doc, updateDoc, collection, query, where, onSnapshot, getDoc } from "firebase/firestore";
import { RecaptchaVerifier, linkWithPhoneNumber, ConfirmationResult } from "firebase/auth";
import { BadgeCheck, Phone, ShieldCheck, Loader2, User as UserIcon, MessageSquare, ArrowRight, Package, Heart, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Chat, Listing, User } from "../types";
import { useNavigate } from "react-router-dom";
import ListingCard from "../components/ListingCard";

interface ChatWithDetails extends Chat {
  listing?: Listing;
  otherUser?: User;
}

export default function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [verifying, setVerifying] = useState(false);
  const [chats, setChats] = useState<ChatWithDetails[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState(1); // 1: Phone, 2: OTP, 3: Success
  const [error, setError] = useState<string | null>(null);
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [activeTab, setActiveTab] = useState<'profile' | 'listings' | 'saved' | 'chats'>('profile');
  const [myListings, setMyListings] = useState<Listing[]>([]);
  const [savedListings, setSavedListings] = useState<Listing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    // Fetch Chats
    const qChats = query(
      collection(db, "chats"),
      where("participants", "array-contains", user.uid)
    );

    const unsubscribeChats = onSnapshot(qChats, async (snapshot) => {
      const chatData = await Promise.all(snapshot.docs.map(async (chatDoc) => {
        const data = { id: chatDoc.id, ...chatDoc.data() } as Chat;
        
        // Fetch listing
        const listingRef = doc(db, "listings", data.listingId);
        const listingSnap = await getDoc(listingRef);
        const listing = listingSnap.exists() ? { id: listingSnap.id, ...listingSnap.data() } as Listing : undefined;

        // Fetch other user
        const otherUserId = data.participants.find(p => p !== user.uid);
        let otherUser: User | undefined;
        if (otherUserId) {
          const userRef = doc(db, "users", otherUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            otherUser = userSnap.data() as User;
          }
        }

        return { ...data, listing, otherUser };
      }));

      setChats(chatData.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()));
      setChatsLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "chats");
    });

    // Fetch My Listings
    const qListings = query(collection(db, "listings"), where("sellerId", "==", user.uid));
    const unsubscribeListings = onSnapshot(qListings, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      setMyListings(data.filter(l => l.status !== 'deleted'));
      setListingsLoading(false);
    });

    return () => {
      unsubscribeChats();
      unsubscribeListings();
    };
  }, [user]);

  useEffect(() => {
    if (!user || !user.favorites || user.favorites.length === 0) {
      setSavedListings([]);
      return;
    }
    
    const fetchSaved = async () => {
      try {
        const promises = user.favorites!.map(id => getDoc(doc(db, "listings", id)));
        const snaps = await Promise.all(promises);
        const saved = snaps.filter(snap => snap.exists()).map(snap => ({ id: snap.id, ...snap.data() } as Listing));
        setSavedListings(saved.filter(l => l.status !== 'deleted'));
      } catch (error) {
        console.error("Error fetching saved listings:", error);
      }
    };
    fetchSaved();
  }, [user?.favorites]);

  const setupRecaptcha = () => {
    if (!(window as any).recaptchaVerifier) {
      (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
      });
    }
  };

  const handleSendOTP = async () => {
    if (!phone) return;
    setVerifying(true);
    setError(null);
    try {
      setupRecaptcha();
      const appVerifier = (window as any).recaptchaVerifier;
      // Ensure phone has country code. Default to +91 for India if not provided.
      const formattedPhone = phone.startsWith('+') ? phone : `+91${phone}`;
      const confirmation = await linkWithPhoneNumber(auth.currentUser!, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setStep(2);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to send OTP. Ensure phone number includes country code (e.g. +91).");
      if ((window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier.clear();
        (window as any).recaptchaVerifier = null;
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleVerifyOTP = async () => {
    if (!otp || !user || !confirmationResult) return;
    setVerifying(true);
    setError(null);

    try {
      await confirmationResult.confirm(otp);
      await updateDoc(doc(db, "users", user.uid), {
        isVerified: true,
        phoneNumber: phone
      });
      setStep(3); // Success
    } catch (err: any) {
      console.error(err);
      setError("Invalid OTP or verification failed. Try again.");
    } finally {
      setVerifying(false);
    }
  };

  if (!user) return null;

  const tabs = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'listings', label: 'My Listings', icon: Package },
    { id: 'saved', label: 'Saved Items', icon: Heart },
    { id: 'chats', label: 'My Chats', icon: MessageSquare },
  ] as const;

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Tabs */}
      <div className="flex overflow-x-auto pb-2 space-x-2 scrollbar-hide">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center space-x-2 px-6 py-3 rounded-full whitespace-nowrap text-sm font-bold transition-all ${
              activeTab === tab.id
                ? "bg-teal-900 text-white shadow-lg"
                : "bg-white text-stone-600 hover:bg-stone-100 border border-stone-200"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'profile' && (
          <motion.div
            key="profile"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-8 max-w-2xl mx-auto"
          >
            <div className="bg-white rounded-3xl shadow-xl p-8 border border-stone-100 flex flex-col items-center text-center space-y-4">
              <div className="relative">
                <img
                  src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`}
                  alt=""
                  className="w-32 h-32 rounded-full border-4 border-teal-900 shadow-xl"
                />
                {user.isVerified && (
                  <div className="absolute bottom-0 right-0 bg-gold-500 p-2 rounded-full shadow-lg">
                    <BadgeCheck className="w-6 h-6 text-teal-900" />
                  </div>
                )}
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-900">{user.displayName}</h1>
                <p className="text-stone-500">{user.email}</p>
              </div>
              <div className="flex items-center space-x-2 bg-stone-50 px-4 py-2 rounded-full text-sm font-semibold text-stone-600">
                <UserIcon className="w-4 h-4" />
                <span>Member since {new Date(user.createdAt).toLocaleDateString()}</span>
              </div>
            </div>

            {!user.isVerified && (
              <div className="bg-teal-900 text-white rounded-3xl p-8 shadow-2xl space-y-6">
                <div className="flex items-center space-x-4">
                  <div className="p-3 bg-gold-500 rounded-2xl">
                    <ShieldCheck className="w-8 h-8 text-teal-900" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Get Verified</h2>
                    <p className="text-teal-200">Verified users get 3x more sales and trust.</p>
                  </div>
                </div>

                {step === 1 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-teal-300">Phone Number</label>
                      <div className="relative">
                        <Phone className="absolute left-4 top-3.5 w-5 h-5 text-teal-400" />
                        <input
                          type="tel"
                          value={phone}
                          onChange={(e) => setPhone(e.target.value)}
                          placeholder="+91 98765 43210"
                          className="w-full bg-teal-800 border-none rounded-2xl py-4 pl-12 pr-4 text-white focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                        />
                      </div>
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <div id="recaptcha-container"></div>
                    <button
                      onClick={handleSendOTP}
                      disabled={verifying || !phone}
                      className="w-full bg-gold-500 text-teal-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gold-600 transition-all shadow-xl disabled:opacity-50"
                    >
                      {verifying ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Send OTP"}
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="block text-xs font-bold uppercase tracking-widest text-teal-300">Enter 6-Digit OTP</label>
                      <input
                        type="text"
                        maxLength={6}
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        placeholder="123456"
                        className="w-full bg-teal-800 border-none rounded-2xl py-4 px-6 text-white text-center text-2xl font-bold tracking-[1em] focus:ring-2 focus:ring-gold-500 outline-none transition-all"
                      />
                    </div>
                    {error && <p className="text-red-400 text-sm text-center">{error}</p>}
                    <button
                      onClick={handleVerifyOTP}
                      disabled={verifying || otp.length !== 6}
                      className="w-full bg-gold-500 text-teal-900 py-4 rounded-2xl font-black uppercase tracking-widest hover:bg-gold-600 transition-all shadow-xl disabled:opacity-50"
                    >
                      {verifying ? <Loader2 className="w-6 h-6 animate-spin mx-auto" /> : "Verify & Upgrade"}
                    </button>
                    <button onClick={() => setStep(1)} className="w-full text-teal-300 text-sm hover:underline">Change Phone Number</button>
                  </div>
                )}

                {step === 3 && (
                  <div className="text-center py-8 space-y-4">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="w-20 h-20 bg-gold-500 rounded-full flex items-center justify-center mx-auto"
                    >
                      <BadgeCheck className="w-12 h-12 text-teal-900" />
                    </motion.div>
                    <h3 className="text-2xl font-bold">You're Verified!</h3>
                    <p className="text-teal-200">Your profile now features the gold badge of trust.</p>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'listings' && (
          <motion.div
            key="listings"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {listingsLoading ? (
              <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-teal-600" /></div>
            ) : myListings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-stone-100">
                <Package className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-stone-900">No listings yet</h3>
                <p className="text-stone-500 mb-6">Start selling your pre-loved items today.</p>
                <button onClick={() => navigate('/sell')} className="bg-teal-900 text-white px-6 py-3 rounded-full font-bold">Sell an Item</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {myListings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'saved' && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            {savedListings.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-3xl shadow-sm border border-stone-100">
                <Heart className="w-12 h-12 text-stone-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-stone-900">No saved items</h3>
                <p className="text-stone-500 mb-6">Items you favorite will appear here.</p>
                <button onClick={() => navigate('/')} className="bg-teal-900 text-white px-6 py-3 rounded-full font-bold">Browse Listings</button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedListings.map(listing => (
                  <ListingCard key={listing.id} listing={listing} />
                ))}
              </div>
            )}
          </motion.div>
        )}

        {activeTab === 'chats' && (
          <motion.div
            key="chats"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white rounded-3xl shadow-xl p-8 border border-stone-100 space-y-6 max-w-2xl mx-auto"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-teal-100 rounded-xl">
                  <MessageSquare className="w-6 h-6 text-teal-600" />
                </div>
                <h2 className="text-2xl font-bold text-stone-900">My Chats</h2>
              </div>
              <span className="text-xs font-bold text-stone-400 uppercase tracking-widest">{chats.length} Active</span>
            </div>

            {chatsLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
              </div>
            ) : chats.length === 0 ? (
              <div className="text-center py-12 space-y-2">
                <p className="text-stone-400">No active conversations yet.</p>
                <button onClick={() => navigate("/")} className="text-teal-600 font-semibold hover:underline">Browse Listings</button>
              </div>
            ) : (
              <div className="space-y-4">
                {chats.map((chat) => (
                  <button
                    key={chat.id}
                    onClick={() => navigate(`/chat/${chat.id}`)}
                    className="w-full flex items-center justify-between p-4 bg-stone-50 rounded-2xl hover:bg-stone-100 transition-all border border-transparent hover:border-stone-200 group"
                  >
                    <div className="flex items-center space-x-4">
                      <img
                        src={chat.otherUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${chat.otherUser?.uid}`}
                        alt=""
                        className="w-12 h-12 rounded-full border-2 border-white shadow-sm"
                      />
                      <div className="text-left">
                        <h4 className="font-bold text-stone-900">{chat.otherUser?.displayName || "User"}</h4>
                        <p className="text-xs text-stone-500 truncate max-w-[200px]">
                          {chat.lastMessage || `About: ${chat.listing?.title}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      {chat.listing?.images[0] && (
                        <img src={chat.listing.images[0]} alt="" className="w-10 h-10 rounded-lg object-cover border border-white shadow-sm" />
                      )}
                      <ArrowRight className="w-5 h-5 text-stone-300 group-hover:text-teal-600 transition-colors" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
