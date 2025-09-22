import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase/config';

// Import components (we'll create these next)
import Login from './components/Auth/Login';
import Dashboard from './components/Dashboard/Dashboard';
import SpotFinder from './components/SpotFinder/SpotFinder';
import PostSpot from './components/PostSpot/PostSpot';
import Profile from './components/Profile/Profile';
import Messages from './components/Messages/Messages';
import LoadingSpinner from './components/UI/LoadingSpinner';

// Import CSS
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Listen for authentication state changes
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return () => unsubscribe();
  }, []);

  // Request location permission on app load
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // Store location in sessionStorage for use throughout app
          sessionStorage.setItem('userLatitude', position.coords.latitude);
          sessionStorage.setItem('userLongitude', position.coords.longitude);
        },
        (error) => {
          console.warn('Location permission denied:', error);
          // Set default location (SF downtown for demo)
          sessionStorage.setItem('userLatitude', '37.7749');
          sessionStorage.setItem('userLongitude', '-122.4194');
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 300000 // 5 minutes
        }
      );
    }
  }, []);

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="App">
      <Router>
        <Routes>
          {/* Public routes */}
          <Route 
            path="/login" 
            element={user ? <Navigate to="/dashboard" /> : <Login />} 
          />
          
          {/* Protected routes */}
          <Route 
            path="/dashboard" 
            element={user ? <Dashboard user={user} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/find-spots" 
            element={user ? <SpotFinder user={user} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/post-spot" 
            element={user ? <PostSpot user={user} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/messages" 
            element={user ? <Messages user={user} /> : <Navigate to="/login" />} 
          />
          
          <Route 
            path="/profile" 
            element={user ? <Profile user={user} /> : <Navigate to="/login" />} 
          />
          
          {/* Default redirect */}
          <Route 
            path="/" 
            element={user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />} 
          />
        </Routes>
      </Router>
    </div>
  );
}

export default App;
