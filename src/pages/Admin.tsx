import React, { useState, useEffect } from "react";
import { collection, getDocs, deleteDoc, doc, Timestamp } from "firebase/firestore";
import { db, auth } from "../firebase";
import { useAuth } from "../App";
import { Trash2, Users, ShoppingBag, ShieldAlert } from "lucide-react";
import { toast } from "react-hot-toast";
import { Link } from "react-router-dom";

export default function Admin() {
  const { user: currentUser, loading: authLoading } = useAuth();
  
  // Actually check if current user is admin via their logged-in email
  const isCorrectEmail = currentUser?.email === "secondinnings17@gmail.com";
  
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Second layer of auth
  
  const [listings, setListings] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isCorrectEmail && isAuthenticated) {
      fetchDa();
    }
  }, [isCorrectEmail, isAuthenticated]);

  const fetchDa = async () => {
    try {
      const listingSnap = await getDocs(collection(db, "listings"));
      setListings(listingSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      
      const usersSnap = await getDocs(collection(db, "users"));
      setUsers(usersSnap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      toast.error("Error fetching data. Check permissions.");
    }
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === "Jumbopack@#1137#$") {
      setIsAuthenticated(true);
      toast.success("Admin access granted.");
    } else {
      toast.error("Invalid admin password.");
    }
  };

  const deleteListing = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await deleteDoc(doc(db, "listings", id));
      setListings(listings.filter(l => l.id !== id));
      toast.success("Listing deleted");
    } catch (e: any) {
      toast.error("Delete failed: " + e.message);
    }
  };

  const deleteUser = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this user's profile data?")) return;
    try {
      await deleteDoc(doc(db, "users", id));
      setUsers(users.filter(u => u.id !== id));
      toast.success("User profile deleted");
    } catch (e: any) {
      toast.error("Delete failed: " + e.message);
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50"><div className="animate-pulse flex flex-col items-center"><div className="w-12 h-12 border-4 border-teal-900 border-t-transparent rounded-full animate-spin"></div><p className="mt-4 text-teal-900 font-medium">Loading...</p></div></div>;
  }

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

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 rounded-2xl shadow-xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldAlert className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Password</h1>
          <p className="text-gray-500 text-sm mt-2">Enter admin master password to proceed</p>
        </div>

        <form onSubmit={handlePasswordSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-teal-900 text-white font-semibold py-3 rounded-lg hover:bg-teal-800 transition-colors"
          >
            Access Dashboard
          </button>
        </form>
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
          <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-teal-600" /> All Listings ({listings.length})
            </h2>
          </div>
          <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
            {listings.map(l => (
              <div key={l.id} className="p-4 flex items-center justify-between hover:bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">{l.title}</h3>
                  <p className="text-sm text-gray-500">₹{l.price} • {l.category}</p>
                </div>
                <button onClick={() => deleteListing(l.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                  <Trash2 className="w-5 h-5" />
                </button>
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
    </div>
  );
}
