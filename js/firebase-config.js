// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAuo6JCx0iz6Gm5MpEMqXpbUZLZ875-chE",
  authDomain: "my-app-847291.firebaseapp.com",
  projectId: "my-app-847291",
  storageBucket: "my-app-847291.firebasestorage.app",
  messagingSenderId: "261910579260",
  appId: "1:261910579260:web:fc2a25574cae570aac1b39"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore();

// Admin credentials (for special admin authentication)
const ADMIN_EMAIL = 'admin@omabeauty.tn';
const ADMIN_PASSWORD = 'Admin@2025';

// Enable offline persistence (using the older method for compatibility)
db.enablePersistence({ synchronizeTabs: true })
  .catch((err) => {
    if (err.code == 'failed-precondition') {
      console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code == 'unimplemented') {
      console.warn('The current browser does not support persistence.');
    }
  });

console.log('Firebase initialized successfully');
