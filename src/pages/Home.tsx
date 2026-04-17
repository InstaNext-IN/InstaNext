import React, { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, where } from "firebase/firestore";
import { db } from "../firebase";
import { Listing } from "../types";
import ListingCard from "../components/ListingCard";
import { motion } from "framer-motion";
import { useSearchParams } from "react-router-dom";
import { Search, LayoutGrid, Smartphone, Sofa, Car, Book, Shirt, Package, Filter, ArrowUpDown } from "lucide-react";
import { OperationType, handleFirestoreError } from "../firebase";
import LocationSelector from "../components/LocationSelector";

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const q = searchParams.get("q")?.toLowerCase() || "";
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filterState, setFilterState] = useState("");
  const [filterDistrict, setFilterDistrict] = useState("");
  const [filterCity, setFilterCity] = useState("");
  const [filterArea, setFilterArea] = useState("");
  const [condition, setCondition] = useState("All");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [showFilters, setShowFilters] = useState(false);

  const categories = [
    { name: "All", icon: LayoutGrid },
    { name: "Electronics", icon: Smartphone },
    { name: "Furniture", icon: Sofa },
    { name: "Vehicles", icon: Car },
    { name: "Books", icon: Book },
    { name: "Fashion", icon: Shirt },
    { name: "Other", icon: Package },
  ];

  useEffect(() => {
    const qListing = query(collection(db, "listings"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(qListing, (snapshot) => {
      let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Listing));
      
      // Filter out deleted
      data = data.filter(l => l.status !== 'deleted');
      
      // Filter by category
      if (selectedCategory !== "All") {
        data = data.filter(l => l.category === selectedCategory);
      }
      
      // Filter by Location
      if (filterState) {
        data = data.filter(l => l.state === filterState);
      }
      if (filterDistrict) {
        data = data.filter(l => l.district === filterDistrict);
      }
      if (filterCity) {
        data = data.filter(l => l.city?.toLowerCase().includes(filterCity.toLowerCase()));
      }
      if (filterArea) {
        data = data.filter(l => l.area?.toLowerCase().includes(filterArea.toLowerCase()));
      }

      // Filter by condition
      if (condition !== "All") {
        data = data.filter(l => l.condition === condition);
      }

      // Filter by price
      if (minPrice) {
        data = data.filter(l => l.price >= Number(minPrice));
      }
      if (maxPrice) {
        data = data.filter(l => l.price <= Number(maxPrice));
      }
      
      // Filter by search query
      if (q) {
        data = data.filter(l => l.title.toLowerCase().includes(q) || l.description.toLowerCase().includes(q));
      }
      
      // Sort
      if (sortBy === "price_asc") {
        data.sort((a, b) => a.price - b.price);
      } else if (sortBy === "price_desc") {
        data.sort((a, b) => b.price - a.price);
      } else {
        // newest is default from query, but we might have messed up order during filtering
        data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }
      
      setListings(data);
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, "listings");
    });

    return () => unsubscribe();
  }, [q, selectedCategory, filterState, filterDistrict, filterCity, filterArea, condition, minPrice, maxPrice, sortBy]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-8"
    >
      <section className="text-center space-y-4 py-12 bg-teal-900 text-white rounded-3xl shadow-xl overflow-hidden relative">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gold-500 via-transparent to-transparent" />
        <h1 className="text-5xl font-bold tracking-tight">
          Insta <span className="text-gold-500 italic">Next.in</span>
        </h1>
        <p className="text-teal-100 text-lg max-w-2xl mx-auto relative z-10">
          Give pre-loved items a new life. Secure, verified, and community-driven.
        </p>
      </section>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-4">
        {categories.map(cat => (
          <button
            key={cat.name}
            onClick={() => setSelectedCategory(cat.name)}
            className={`flex flex-col items-center justify-center p-4 rounded-2xl transition-all ${
              selectedCategory === cat.name
                ? "bg-teal-900 text-white shadow-lg scale-105"
                : "bg-white text-stone-600 hover:bg-stone-50 border border-stone-200 hover:border-teal-500"
            }`}
          >
            <cat.icon className={`w-8 h-8 mb-2 ${selectedCategory === cat.name ? 'text-gold-400' : 'text-teal-600'}`} />
            <span className="text-sm font-bold">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-stone-200 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4 flex-1">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-4 py-2.5 rounded-xl font-medium transition-colors ${showFilters ? 'bg-teal-100 text-teal-800' : 'bg-stone-50 text-stone-700 border border-stone-200 hover:bg-stone-100'}`}
            >
              <Filter className="w-5 h-5" />
              <span>Location & Filters</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <ArrowUpDown className="w-5 h-5 text-stone-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="pt-4 border-t border-stone-100 space-y-6"
          >
            <div className="bg-stone-50 rounded-xl p-4 border border-stone-100">
              <h3 className="text-sm font-bold text-stone-700 mb-4 tracking-wider uppercase">Location Filter</h3>
              <LocationSelector
                state={filterState} setState={setFilterState}
                district={filterDistrict} setDistrict={setFilterDistrict}
                city={filterCity} setCity={setFilterCity}
                area={filterArea} setArea={setFilterArea}
              />
            </div>
          
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Condition</label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value)}
                  className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500 font-medium text-stone-700"
                >
                  <option value="All">Any Condition</option>
                  <option value="Brand New">Brand New</option>
                  <option value="Like New">Like New</option>
                  <option value="Used">Used</option>
                  <option value="Heavily Used">Heavily Used</option>
                </select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-stone-500">Price Range (₹)</label>
                <div className="flex items-center space-x-4">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPrice}
                    onChange={(e) => setMinPrice(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="text-stone-400 font-bold">to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(e.target.value)}
                    className="w-full bg-stone-50 border border-stone-200 rounded-xl px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
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
        <div className="text-center py-20 space-y-4">
          <Search className="w-16 h-16 text-stone-300 mx-auto" />
          <h2 className="text-2xl font-semibold text-stone-600">No listings found</h2>
          <p className="text-stone-400">Try searching for something else or be the first to sell!</p>
        </div>
      )}
    </motion.div>
  );
}
