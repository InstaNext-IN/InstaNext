import React, { useState, useEffect } from "react";
import { collection, onSnapshot, deleteDoc, doc, Timestamp, orderBy, query } from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType } from "../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";
import { useAuth } from "../App";
import { Trash2, Users, ShoppingBag, ShieldAlert, MessageSquare, CheckCircle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";
import { updateDoc } from "firebase/firestore";

export default function Admin() {
  const { user: currentUser, loading: authLoading } = useAuth();
  
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Second layer of auth
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [supportTickets, setSupportTickets] = useState<any[]>([]);

  // Check if current user is admin via their logged-in email
  const isCorrectEmail = currentUser?.email === "secondinnings17@gmail.com" || auth.currentUser?.email === "secondinnings17@gmail.com";

  useEffect(() => {
    if (isCorrectEmail && isAuthenticated) {
      const unsubListings = onSnapshot(collection(db, "listings"), (snap) => {
        setListings(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Listings error:", err));

      const unsubUsers = onSnapshot(collection(db, "users"), (snap) => {
        setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Users error:", err));

      const qTickets = query(collection(db, "support_tickets"), orderBy("createdAt", "desc"));
      const unsubTickets = onSnapshot(qTickets, (snap) => {
        setSupportTickets(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }, (err) => console.error("Tickets error:", err));

      return () => {
        unsubListings();
        unsubUsers();
        unsubTickets();
      };
    }
  }, [isCorrectEmail, isAuthenticated]);

  const handleGoogleSignIn = async () => {
    setLoginLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      toast.success("Google Login successful");
    } catch (err: any) {
      console.error("Google login error", err);
      toast.error("Failed to login with Google: " + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Submitting password:", password.trim());
    if (password.trim() === "Jumbopack@#1137#$") {
      setIsAuthenticated(true);
      toast.success("Admin access granted.");
    } else {
      toast.error("Invalid admin password.");
    }
  };

  const deleteListing = async (id: string) => {
    toast.dismiss();
    console.log("Admin: Initializing deleteListing for ID:", id);
    if (!window.confirm("Are you sure you want to delete this listing?")) {
      console.log("Admin: Delete cancelled by user");
      return;
    }
    
    const loadingToast = toast.loading("Processing listing removal...");
    try {
      console.log("Admin: Calling Firestore deleteDoc for listings/" + id);
      const docRef = doc(db, "listings", id);
      await deleteDoc(docRef);
      console.log("Admin: Firestore deleteDoc success for listings/" + id);
      toast.success("Listing removed", { id: loadingToast });
    } catch (e: any) {
      console.error("Admin: Delete listing error:", e);
      try {
        handleFirestoreError(e, OperationType.DELETE, `listings/${id}`);
      } catch (wrappedError: any) {
        toast.error("Access Denied: " + wrappedError.message, { id: loadingToast });
      }
    }
  };

  const deleteUser = async (id: string) => {
    toast.dismiss();
    console.log("Admin: Initializing deleteUser for ID:", id);
    if (!window.confirm("Are you sure you want to delete this user profile?")) {
      console.log("Admin: Delete cancelled by user");
      return;
    }
    
    const loadingToast = toast.loading("Processing user removal...");
    try {
      console.log("Admin: Calling Firestore deleteDoc for users/" + id);
      const docRef = doc(db, "users", id);
      await deleteDoc(docRef);
      console.log("Admin: Firestore deleteDoc success for users/" + id);
      toast.success("User profile removed", { id: loadingToast });
    } catch (e: any) {
      console.error("Admin: Delete user error:", e);
      try {
        handleFirestoreError(e, OperationType.DELETE, `users/${id}`);
      } catch (wrappedError: any) {
        toast.error("Access Denied: " + wrappedError.message, { id: loadingToast });
      }
    }
  };

  const deleteTicket = async (id: string) => {
    toast.dismiss();
    console.log("Admin: Initializing deleteTicket for ID:", id);
    if (!window.confirm("Are you sure you want to delete this ticket?")) {
      console.log("Admin: Delete cancelled by user");
      return;
    }
    
    const loadingToast = toast.loading("Processing ticket removal...");
    try {
      console.log("Admin: Calling Firestore deleteDoc for support_tickets/" + id);
      const docRef = doc(db, "support_tickets", id);
      await deleteDoc(docRef);
      console.log("Admin: Firestore deleteDoc success for support_tickets/" + id);
      toast.success("Ticket removed", { id: loadingToast });
    } catch (e: any) {
      console.error("Admin: Delete ticket error:", e);
      try {
        handleFirestoreError(e, OperationType.DELETE, `support_tickets/${id}`);
      } catch (wrappedError: any) {
        toast.error("Access Denied: " + wrappedError.message, { id: loadingToast });
      }
    }
  };

  const approveListing = async (id: string) => {
    toast.dismiss();
    const loadingToast = toast.loading("Approving listing...");
    try {
      const docRef = doc(db, "listings", id);
      await updateDoc(docRef, { status: "active" });
      toast.success("Listing published successfully!", { id: loadingToast });
    } catch (e: any) {
      console.error("Approve error:", e);
      toast.error("Failed to approve: " + e.message, { id: loadingToast });
    }
  };

  const [listingTab, setListingTab] = useState<'all' | 'pending' | 'active'>('pending');

  // Filter listings based on tab
  const filteredListings = listings.filter(l => {
    if (listingTab === 'all') return true;
    return l.status === listingTab;
  });

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><div className="animate-pulse flex flex-col items-center"><div className="w-12 h-12 border-4 border-teal-900 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-teal-900 font-medium">Loading...</p></div></div>;
  }

  // If there's no user logged in, give them the admin login screen
  if (!currentUser) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Login</h1>
          <p className="text-gray-500 text-sm mt-2">Restricted Access Portal</p>
        </div>

        <button
          onClick={handleGoogleSignIn}
          disabled={loginLoading}
          className="w-full bg-teal-900 text-white font-semibold py-3 rounded-lg hover:bg-teal-800 transition-colors flex justify-center items-center gap-2"
        >
          {loginLoading ? "Authenticating..." : "Login with Admin Google Account"}
        </button>
      </div>
    );
  }

  // If there's a user logged in, but not the right email, show 404
  if (!isCorrectEmail) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-4">
        <h1 className="text-8xl font-black text-stone-200">404</h1>
        <p className="text-2xl font-medium text-stone-600 mt-4 mb-8">Page not found</p>
        <Link to="/" className="bg-teal-900 text-white px-6 py-3 rounded-full font-semibold hover:bg-teal-800 transition-colors">
          Return to Home
        </Link>
      </div>
    );
  }

  // If it is the right email, ask for the password
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl border border-stone-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-teal-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-teal-100">
            <ShieldAlert className="w-8 h-8 text-teal-600" />
          </div>
          <h1 className="text-2xl font-bold text-stone-900">Admin Authorization</h1>
          <p className="text-stone-500 text-sm mt-2">Authenticated as: <span className="font-semibold text-teal-700">{currentUser?.email}</span></p>
          <p className="text-stone-400 text-xs mt-1 italic">Enter the secondary master password</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-2">Master Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full px-4 py-3 border border-stone-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all outline-none"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-900 text-white font-bold py-4 rounded-xl hover:bg-teal-800 transition-all shadow-lg active:scale-[0.98] flex items-center justify-center gap-2 group"
          >
            Access Dashboard
            <div className="w-2 h-2 bg-teal-400 rounded-full group-hover:animate-ping"></div>
          </button>
        </form>
        
        <div className="mt-6 pt-6 border-t border-stone-100 text-center">
          <button 
            onClick={() => auth.signOut()}
            className="text-stone-400 text-sm hover:text-red-500 transition-colors"
          >
            Not your admin account? Logout
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="bg-teal-100 text-teal-800 px-4 py-2 rounded-full font-medium text-sm">
          Logged in as Super Admin
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Listings Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-teal-600" /> Listings Management
            </h2>
            <div className="flex bg-stone-200 p-1 rounded-lg">
              {(['pending', 'active', 'all'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setListingTab(tab)}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${
                    listingTab === tab 
                      ? 'bg-white text-teal-900 shadow-sm' 
                      : 'text-stone-500 hover:text-stone-700'
                  }`}
                >
                  {tab.toUpperCase()} ({listings.filter(l => tab === 'all' || l.status === tab).length})
                </button>
              ))}
            </div>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {filteredListings.map(l => (
              <div key={l.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-gray-900">{l.title}</h3>
                    {l.status === 'pending' ? (
                      <span className="flex items-center gap-1 text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <Clock className="w-3 h-3" /> Pending
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">
                        <CheckCircle className="w-3 h-3" /> Active
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">₹{l.price} • {l.category}</p>
                </div>
                <div className="flex items-center gap-2">
                  {l.status === 'pending' && (
                    <button 
                      onClick={() => approveListing(l.id)}
                      className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      title="Approve Listing"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </button>
                  )}
                  <button 
                    onClick={() => deleteListing(l.id)} 
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Listing"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
            {listings.length === 0 && <div className="p-8 text-center text-gray-500">No listings found.</div>}
          </div>
        </div>

        {/* Users Panel */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-600" /> All Users ({users.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {users.map(u => (
              <div key={u.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">{u.displayName || "Unknown User"}</h3>
                  <p className="text-sm text-gray-500">{u.email || "No email"} • {u.uid}</p>
                </div>
                <button onClick={() => deleteUser(u.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            ))}
            {users.length === 0 && <div className="p-8 text-center text-gray-500">No users found.</div>}
          </div>
        </div>
      </div>

      {/* Support Tickets Panel */}
      <div className="mt-8 bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gold-600" /> Support Tickets ({supportTickets.length})
          </h2>
        </div>
        <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
          {supportTickets.map(t => (
            <div key={t.id} className="p-4 flex items-start justify-between hover:bg-gray-50">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-gray-900">{t.userEmail}</h3>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full">{t.status || 'open'}</span>
                  {t.createdAt?.seconds && (
                    <span className="text-xs text-gray-400">
                      {new Date(t.createdAt.seconds * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-600 whitespace-pre-wrap">{t.message}</p>
                <div className="text-xs text-gray-400">UID: {t.userId}</div>
              </div>
              <button onClick={() => deleteTicket(t.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg ml-4 shrink-0">
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
          {supportTickets.length === 0 && <div className="p-8 text-center text-gray-500">No support tickets found.</div>}
        </div>
      </div>
    </div>
  );
}
