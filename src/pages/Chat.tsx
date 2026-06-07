import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  getDoc,
  serverTimestamp,
  updateDoc
} from "firebase/firestore";
import { db, auth, OperationType, handleFirestoreError } from "../firebase";
import { useAuth } from "../App";
import { Message, Chat as ChatType, Listing, User } from "../types";
import { Send, ShieldAlert, ArrowLeft, Loader2, AlertCircle, Flag, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const SAFETY_RULES = [
  "Never share your personal phone number or email early.",
  "Always meet in a public, well-lit place.",
  "Inspect the item thoroughly before paying.",
  "Avoid wire transfers or advanced payments.",
  "Trust your gut—if it feels suspicious, report it."
];

export default function Chat() {
  const { chatId } = useParams();
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [chat, setChat] = useState<ChatType | null>(null);
  const [listing, setListing] = useState<Listing | null>(null);
  const [otherUser, setOtherUser] = useState<User | null>(null);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!chatId || !user) return;

    const chatRef = doc(db, "chats", chatId);
    const unsubscribeChat = onSnapshot(chatRef, async (docSnap) => {
      if (docSnap.exists()) {
        const chatData = { id: docSnap.id, ...docSnap.data() } as ChatType;
        setChat(chatData);

        // Fetch listing
        const listingRef = doc(db, "listings", chatData.listingId);
        const listingSnap = await getDoc(listingRef);
        if (listingSnap.exists()) {
          setListing({ id: listingSnap.id, ...listingSnap.data() } as Listing);
        }

        // Fetch other user
        const otherUserId = chatData.participants.find(p => p !== user.uid);
        if (otherUserId) {
          const userRef = doc(db, "users", otherUserId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setOtherUser(userSnap.data() as User);
          }
        }
      }
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}`);
    });

    const messagesQuery = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsubscribeMessages = onSnapshot(messagesQuery, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate()?.toISOString() || new Date().toISOString()
      } as Message));
      setMessages(msgs);
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, `chats/${chatId}/messages`);
    });

    return () => {
      unsubscribeChat();
      unsubscribeMessages();
    };
  }, [chatId, user]);

  const handleReportUser = async () => {
    if (!user || !otherUser) return;
    const reason = prompt(`Why are you reporting ${otherUser.displayName}?`);
    if (!reason) return;
    
    try {
      await addDoc(collection(db, "reports"), {
        reportedUserId: otherUser.uid,
        reporterId: user.uid,
        chatId: chatId,
        reason,
        createdAt: serverTimestamp()
      });
      alert("User reported successfully. Our team will review it.");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "reports");
    }
  };

  const handleRateUser = async () => {
    if (!user || !otherUser) return;
    const ratingStr = prompt(`Rate ${otherUser.displayName} from 1 to 5 stars:`);
    if (!ratingStr) return;
    const rating = parseInt(ratingStr);
    if (isNaN(rating) || rating < 1 || rating > 5) {
      alert("Please enter a valid number between 1 and 5.");
      return;
    }
    
    try {
      // In a real app, you'd store individual ratings in a subcollection and calculate the average.
      // For simplicity, we'll just update the user's rating directly (this is insecure in prod without cloud functions).
      const currentRating = otherUser.rating || 0;
      const currentCount = otherUser.ratingCount || 0;
      const newCount = currentCount + 1;
      const newRating = ((currentRating * currentCount) + rating) / newCount;
      
      await updateDoc(doc(db, "users", otherUser.uid), {
        rating: Number(newRating.toFixed(1)),
        ratingCount: newCount
      });
      alert("Rating submitted! Thank you.");
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, "users");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !user || sending) return;

    setSending(true);
    try {
      const messageData = {
        senderId: user.uid,
        text: newMessage.trim(),
        createdAt: serverTimestamp()
      };

      await addDoc(collection(db, "chats", chatId, "messages"), messageData);
      await updateDoc(doc(db, "chats", chatId), {
        lastMessage: newMessage.trim(),
        updatedAt: serverTimestamp()
      });
      setNewMessage("");
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `chats/${chatId}/messages`);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  if (!chat) {
    return (
      <div className="text-center py-20">
        <AlertCircle className="w-12 h-12 text-stone-300 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-stone-600">Chat not found</h2>
        <button onClick={() => navigate("/")} className="mt-4 text-teal-600 font-semibold">Go Home</button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-12rem)] flex flex-col bg-white rounded-3xl shadow-xl overflow-hidden border border-stone-100">
      {/* Header */}
      <div className="bg-teal-900 p-4 text-white flex items-center space-x-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-teal-800 rounded-full transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h2 className="font-bold">{otherUser?.displayName || "User"}</h2>
          {listing && <p className="text-xs text-teal-200 truncate">Re: {listing.title}</p>}
        </div>
        <div className="flex items-center space-x-2">
          {listing?.status === 'sold' && listing.sellerId !== user?.uid && (
            <button onClick={handleRateUser} className="hidden sm:flex items-center space-x-1 bg-gold-500 text-teal-900 px-3 py-1 rounded-full text-xs font-bold hover:bg-gold-600 transition-colors">
              <Star className="w-3 h-3 fill-current" />
              <span>Rate Seller</span>
            </button>
          )}
          <div className="hidden sm:flex items-center space-x-2 bg-teal-800/50 px-3 py-1 rounded-full text-xs">
            <ShieldAlert className="w-3 h-3 text-amber-400" />
            <span className="text-amber-100 font-medium">Safe Trade</span>
          </div>
          <button onClick={handleReportUser} className="p-2 hover:bg-teal-800 rounded-full transition-colors text-stone-300 hover:text-red-400" title="Report User">
            <Flag className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Messages Area */}
        <div className="flex-1 flex flex-col p-4 overflow-y-auto space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.senderId === user?.uid ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] p-3 rounded-2xl text-sm ${
                  msg.senderId === user?.uid
                    ? "bg-teal-600 text-white rounded-tr-none"
                    : "bg-stone-100 text-stone-800 rounded-tl-none"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          <div ref={scrollRef} />
        </div>

        {/* Safety Rules Sidebar (Desktop) */}
        <div className="hidden md:block w-64 bg-stone-50 border-l border-stone-100 p-6 space-y-6">
          <div className="flex items-center space-x-2 text-amber-600">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="font-bold text-sm uppercase tracking-wider">Safety Rules</h3>
          </div>
          <ul className="space-y-4">
            {SAFETY_RULES.map((rule, i) => (
              <li key={i} className="flex space-x-3 text-xs text-stone-600 leading-relaxed">
                <span className="text-teal-600 font-bold">{i + 1}.</span>
                <span>{rule}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Input Area */}
      <form onSubmit={handleSendMessage} className="p-4 border-t border-stone-100 bg-stone-50 flex items-center space-x-2">
        <input
          type="text"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 bg-white border border-stone-200 rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="p-2 bg-teal-600 text-white rounded-full hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        </button>
      </form>

      {/* Mobile Safety Rules (Floating) */}
      <div className="md:hidden p-2 bg-amber-50 border-t border-amber-100 flex items-center justify-center space-x-2 text-[10px] text-amber-800">
        <ShieldAlert className="w-3 h-3" />
        <span>Always meet in public & inspect items before paying.</span>
      </div>
    </div>
  );
}
