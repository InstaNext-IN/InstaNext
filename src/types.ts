export interface User {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  phoneNumber?: string;
  isVerified: boolean;
  createdAt: string;
  favorites?: string[];
  rating?: number;
  ratingCount?: number;
}

export interface Listing {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  price: number;
  originalPrice?: number;
  category: string;
  images: string[];
  location: {
    lat: number;
    lng: number;
    address: string;
  };
  isVerified: boolean;
  status?: 'active' | 'sold' | 'deleted';
  condition?: string;
  state?: string;
  district?: string;
  city?: string;
  area?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface Chat {
  id: string;
  participants: string[];
  listingId: string;
  lastMessage?: string;
  updatedAt: string;
}
