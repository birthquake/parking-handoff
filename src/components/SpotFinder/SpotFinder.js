import React, { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../firebase/config';
import { formatDistanceToNow, format } from 'date-fns';
import Navigation from '../Navigation/Navigation';

const SpotFinder = ({ user }) => {
  const [spots, setSpots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reservingSpot, setReservingSpot] = useState(null);
  const [filters, setFilters] = useState({
    maxPrice: '',
    spotType: '',
    city: ''
  });

  // Real-time listener for available spots
  useEffect(() => {
    const spotsQuery = query(
      collection(db, COLLECTIONS.SPOTS),
      where('status', '==', 'available'),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(spotsQuery, (snapshot) => {
      const spotsData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        // Convert Firestore timestamps to JS dates
        const spot = {
          id: doc.id,
          ...data,
          availableAt: data.availableAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          expiresAt: data.expiresAt?.toDate()
        };
        
        // Filter out past spots in JavaScript instead of Firestore query
        if (spot.availableAt && spot.availableAt > new Date()) {
          spotsData.push(spot);
        }
      });
      
      // Sort by availableAt
      spotsData.sort((a, b) => a.availableAt - b.availableAt);
      
      setSpots(spotsData);
      setLoading(false);
    }, (error) => {
      console.error('Error fetching spots:', error);
      setError('Failed to load parking spots');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleReserveSpot = async (spotId) => {
    setReservingSpot(spotId);
    setError('');

    try {
      const spotRef = doc(db, COLLECTIONS.SPOTS, spotId);
      
      await updateDoc(spotRef, {
        status: 'reserved',
        reservedBy: user.uid,
        reservedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Note: In a real app, you'd also create a transaction/handoff record
      // and initiate messaging between the users
      
    } catch (error) {
      console.error('Error reserving spot:', error);
      setError('Failed to reserve spot. Please try again.');
    } finally {
      setReservingSpot(null);
    }
  };

  const filteredSpots = spots.filter(spot => {
    if (filters.maxPrice && spot.price > parseFloat(filters.maxPrice)) return false;
    if (filters.spotType && spot.spotType !== filters.spotType) return false;
    if (filters.city && !spot.city.toLowerCase().includes(filters.city.toLowerCase())) return false;
    return true;
  });

  const handleFilterChange = (e) => {
    setFilters({
      ...filters,
      [e.target.name]: e.target.value
    });
  };

  const clearFilters = () => {
    setFilters({
      maxPrice: '',
      spotType: '',
      city: ''
    });
  };

  const getSpotTypeIcon = (type) => {
    switch (type) {
      case 'street': return '🛣️';
      case 'garage': return '🏢';
      case 'lot': return '🅿️';
      case 'driveway': return '🏠';
      default: return '📍';
    }
  };

  const getTimeUntilAvailable = (availableAt) => {
    const now = new Date();
    if (availableAt <= now) return 'Available now';
    return `Available ${formatDistanceToNow(availableAt, { addSuffix: true })}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading available spots...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Parking Spots
          </h1>
          <p className="mt-2 text-gray-600">
            Discover available parking spots from other drivers.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Filters</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                type="text"
                id="city"
                name="city"
                value={filters.city}
                onChange={handleFilterChange}
                placeholder="Enter city"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="maxPrice" className="block text-sm font-medium text-gray-700">
                Max Price ($)
              </label>
              <input
                type="number"
                id="maxPrice"
                name="maxPrice"
                value={filters.maxPrice}
                onChange={handleFilterChange}
                placeholder="Any price"
                min="0"
                step="0.50"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label htmlFor="spotType" className="block text-sm font-medium text-gray-700">
                Spot Type
              </label>
              <select
                id="spotType"
                name="spotType"
                value={filters.spotType}
                onChange={handleFilterChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Any type</option>
                <option value="street">Street Parking</option>
                <option value="garage">Parking Garage</option>
                <option value="lot">Parking Lot</option>
                <option value="driveway">Driveway</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={clearFilters}
                className="w-full bg-gray-200 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6">
            {error}
          </div>
        )}

        {/* Spots List */}
        <div className="space-y-4">
          {filteredSpots.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No spots available
              </h3>
              <p className="text-gray-600">
                {spots.length === 0 
                  ? "No parking spots are currently available. Check back later!"
                  : "No spots match your current filters. Try adjusting your search criteria."
                }
              </p>
            </div>
          ) : (
            filteredSpots.map((spot) => (
              <div key={spot.id} className="bg-white rounded-lg shadow p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-2xl">{getSpotTypeIcon(spot.spotType)}</span>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {spot.address}
                      </h3>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        Available
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-2">{spot.city}</p>
                    
                    {spot.description && (
                      <p className="text-gray-600 mb-3">{spot.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>⏰ {getTimeUntilAvailable(spot.availableAt)}</span>
                      <span>📅 {format(spot.availableAt, 'MMM d, h:mm a')}</span>
                      <span>⏱️ {spot.duration} minutes</span>
                      <span className="capitalize">🏷️ {spot.spotType.replace('_', ' ')}</span>
                    </div>
                  </div>
                  
                  <div className="ml-6 text-right">
                    <div className="text-2xl font-bold text-green-600 mb-2">
                      ${spot.price}
                    </div>
                    
                    <button
                      onClick={() => handleReserveSpot(spot.id)}
                      disabled={reservingSpot === spot.id || spot.ownerId === user.uid}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {reservingSpot === spot.id ? 'Reserving...' : 
                       spot.ownerId === user.uid ? 'Your Spot' : 'Reserve Spot'}
                    </button>
                    
                    <p className="text-xs text-gray-500 mt-1">
                      You pay: ${(spot.price).toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Summary */}
        {filteredSpots.length > 0 && (
          <div className="mt-6 text-center text-gray-600">
            Showing {filteredSpots.length} of {spots.length} available spots
          </div>
        )}
      </div>
    </div>
  );
};

export default SpotFinder;
