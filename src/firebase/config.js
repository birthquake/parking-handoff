// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCQ2d_zN54DZRBmS_D9BvVm4GOYObeamCc",
  authDomain: "parking-handoff.firebaseapp.com",
  projectId: "parking-handoff",
  storageBucket: "parking-handoff.firebasestorage.app",
  messagingSenderId: "765641283874",
  appId: "1:765641283874:web:4ffd8ec32755ca57f96d7b"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize messaging (with support check for older browsers)
let messaging = null;
isSupported().then((supported) => {
  if (supported) {
    messaging = getMessaging(app);
  }
});

export { messaging };

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  SPOTS: 'parkingSpots',
  TRANSACTIONS: 'transactions',
  MESSAGES: 'messages',
  RATINGS: 'ratings'
};

// App constants
export const APP_CONSTANTS = {
  MAX_SPOT_DURATION: 60, // minutes
  MIN_PRICE: 1,
  MAX_PRICE: 20,
  SEARCH_RADIUS: 0.5, // miles
  TRANSACTION_FEE: 0.25 // 25% platform fee
};

export default app;
