import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../firebase/config';
import { format, formatDistanceToNow, isBefore } from 'date-fns';
import Navigation from '../Navigation/Navigation';

const MySpots = ({ user }) => {
  const [userSpots, setUserSpots] = useState([]);
  const [reservedSpots, setReservedSpots] = useState([]);
  const [activeTab, setActiveTab] = useState('posted');
  const [loading, setLoading] = useState(true);
  const [cancellingSpot, setCancellingSpot] = useState(null);

  useEffect(() => {
    const allSpotsQuery = collection(db, COLLECTIONS.SPOTS);

    const unsubscribe = onSnapshot(allSpotsQuery, (snapshot) => {
      const userPostedSpots = [];
      const userReservedSpots = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        const spot = {
          id: doc.id,
          ...data,
          availableAt: data.availableAt?.toDate(),
          createdAt: data.createdAt?.toDate(),
          reservedAt: data.reservedAt?.toDate(),
          updatedAt: data.updatedAt?.toDate()
        };
        
        if (spot.ownerId === user.uid) {
          userPostedSpots.push(spot);
        }
        
        if (spot.reservedBy === user.uid) {
          userReservedSpots.push(spot);
        }
      });
      
      // Sort by creation date (newest first)
      userPostedSpots.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      userReservedSpots.sort((a, b) => (b.reservedAt || b.updatedAt || 0) - (a.reservedAt || a.updatedAt || 0));
      
      setUserSpots(userPostedSpots);
      setReservedSpots(userReservedSpots);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  const handleCancelSpot = async (spotId) => {
    setCancellingSpot(spotId);
    
    try {
      const spotRef = doc(db, COLLECTIONS.SPOTS, spotId);
      await updateDoc(spotRef, {
        status: 'cancelled',
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error cancelling spot:', error);
    } finally {
      setCancellingSpot(null);
    }
  };

  const handleMarkCompleted = async (spotId) => {
    try {
      const spotRef = doc(db, COLLECTIONS.SPOTS, spotId);
      await updateDoc(spotRef, {
        status: 'completed',
        completedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error marking spot as completed:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
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

  const isSpotExpired = (spot) => {
    return spot.availableAt && isBefore(spot.availableAt, new Date());
  };

  const canCancelSpot = (spot) => {
    return spot.status === 'available' && !isSpotExpired(spot);
  };

  const canMarkCompleted = (spot) => {
    return spot.status === 'reserved' && spot.ownerId === user.uid;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading your spots...</p>
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
          <h1 className="text-3xl font-bold text-gray-900">My Spots</h1>
          <p className="mt-2 text-gray-600">
            Manage your posted spots and reservations.
          </p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-lg shadow">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('posted')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'posted'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Posted Spots ({userSpots.length})
              </button>
              <button
                onClick={() => setActiveTab('reserved')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'reserved'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                My Reservations ({reservedSpots.length})
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'posted' && (
              <div className="space-y-4">
                {userSpots.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You haven't posted any spots yet.</p>
                    <button
                      onClick={() => window.location.href = '/post-spot'}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Post Your First Spot
                    </button>
                  </div>
                ) : (
                  userSpots.map((spot) => (
                    <div key={spot.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xl">{getSpotTypeIcon(spot.spotType)}</span>
                            <h3 className="font-semibold text-gray-900">{spot.address}</h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(spot.status)}`}>
                              {spot.status}
                            </span>
                            {isSpotExpired(spot) && spot.status === 'available' && (
                              <span className="inline-flex px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                                Expired
                              </span>
                            )}
                          </div>
                          
                          <p className="text-gray-600 mb-2">{spot.city}</p>
                          
                          {spot.description && (
                            <p className="text-gray-600 mb-3">{spot.description}</p>
                          )}
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>📅 {format(spot.availableAt, 'MMM d, h:mm a')}</span>
                            <span>⏱️ {spot.duration} minutes</span>
                            <span>🕒 Posted {formatDistanceToNow(spot.createdAt, { addSuffix: true })}</span>
                          </div>

                          {spot.status === 'reserved' && (
                            <div className="mt-2 text-sm text-blue-600">
                              Reserved {formatDistanceToNow(spot.reservedAt, { addSuffix: true })}
                            </div>
                          )}
                        </div>
                        
                        <div className="ml-6 text-right">
                          <div className="text-xl font-bold text-green-600 mb-2">
                            ${spot.price}
                          </div>
                          
                          <div className="space-y-2">
                            {canCancelSpot(spot) && (
                              <button
                                onClick={() => handleCancelSpot(spot.id)}
                                disabled={cancellingSpot === spot.id}
                                className="block w-full bg-red-600 text-white px-3 py-1 text-sm rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                {cancellingSpot === spot.id ? 'Cancelling...' : 'Cancel Spot'}
                              </button>
                            )}
                            
                            {canMarkCompleted(spot) && (
                              <button
                                onClick={() => handleMarkCompleted(spot.id)}
                                className="block w-full bg-green-600 text-white px-3 py-1 text-sm rounded hover:bg-green-700"
                              >
                                Mark Completed
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {activeTab === 'reserved' && (
              <div className="space-y-4">
                {reservedSpots.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500">You haven't reserved any spots yet.</p>
                    <button
                      onClick={() => window.location.href = '/find-spots'}
                      className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                    >
                      Find Spots
                    </button>
                  </div>
                ) : (
                  reservedSpots.map((spot) => (
                    <div key={spot.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <span className="text-xl">{getSpotTypeIcon(spot.spotType)}</span>
                            <h3 className="font-semibold text-gray-900">{spot.address}</h3>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(spot.status)}`}>
                              {spot.status}
                            </span>
                          </div>
                          
                          <p className="text-gray-600 mb-2">{spot.city}</p>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-500">
                            <span>📅 {format(spot.availableAt, 'MMM d, h:mm a')}</span>
                            <span>⏱️ {spot.duration} minutes</span>
                            <span>🕒 Reserved {formatDistanceToNow(spot.reservedAt, { addSuffix: true })}</span>
                          </div>
                        </div>
                        
                        <div className="ml-6 text-right">
                          <div className="text-xl font-bold text-green-600 mb-2">
                            ${spot.price}
                          </div>
                          
                          {spot.status === 'reserved' && (
                            <div className="text-sm text-blue-600">
                              Contact spot owner via Messages
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{userSpots.length}</div>
            <div className="text-sm text-gray-600">Total Posted</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{userSpots.filter(s => s.status === 'reserved').length}</div>
            <div className="text-sm text-gray-600">Currently Reserved</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{userSpots.filter(s => s.status === 'completed').length}</div>
            <div className="text-sm text-gray-600">Completed Handoffs</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySpots;
