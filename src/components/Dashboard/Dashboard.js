import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../firebase/config';
import { format, formatDistanceToNow } from 'date-fns';
import Navigation from '../Navigation/Navigation';

const Dashboard = ({ user }) => {
  const [userSpots, setUserSpots] = useState([]);
  const [reservedSpots, setReservedSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get spots posted by this user
    const userSpotsQuery = query(
      collection(db, COLLECTIONS.SPOTS),
      where('ownerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribeUserSpots = onSnapshot(userSpotsQuery, (snapshot) => {
      const spots = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        spots.push({
          id: doc.id,
          ...data,
          availableAt: data.availableAt?.toDate(),
          createdAt: data.createdAt?.toDate()
        });
      });
      setUserSpots(spots);
    });

    // Get spots reserved by this user
    const reservedSpotsQuery = query(
      collection(db, COLLECTIONS.SPOTS),
      where('reservedBy', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribeReservedSpots = onSnapshot(reservedSpotsQuery, (snapshot) => {
      const spots = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        spots.push({
          id: doc.id,
          ...data,
          availableAt: data.availableAt?.toDate(),
          reservedAt: data.reservedAt?.toDate()
        });
      });
      setReservedSpots(spots);
      setLoading(false);
    });

    return () => {
      unsubscribeUserSpots();
      unsubscribeReservedSpots();
    };
  }, [user.uid]);

  const getStatusColor = (status) => {
    switch (status) {
      case 'available': return 'bg-green-100 text-green-800';
      case 'reserved': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.displayName || user?.email}!
          </h1>
          <p className="mt-2 text-gray-600">
            Find parking spots or post your own spot for handoff.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          {/* Find Spots Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🔍 Find Parking Spots
            </h2>
            <p className="text-gray-600 mb-4">
              Find available parking spots near you from other drivers.
            </p>
            <Link 
              to="/find-spots"
              className="btn btn-primary w-full block text-center"
            >
              Find Spots
            </Link>
          </div>

          {/* Post Spot Card */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              📍 Post Your Spot
            </h2>
            <p className="text-gray-600 mb-4">
              Leaving soon? Post your parking spot for others to take over.
            </p>
            <Link 
              to="/post-spot"
              className="btn btn-success w-full block text-center"
            >
              Post Spot
            </Link>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          
          {loading ? (
            <div className="bg-white rounded-lg shadow p-6 text-center">
              <div className="loading-spinner mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading your activity...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Your Posted Spots */}
              {userSpots.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Your Posted Spots</h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {userSpots.slice(0, 3).map((spot) => (
                      <div key={spot.id} className="px-6 py-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{spot.address}</p>
                            <p className="text-sm text-gray-600">{spot.city}</p>
                            <p className="text-sm text-gray-500">
                              Available {format(spot.availableAt, 'MMM d, h:mm a')}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(spot.status)}`}>
                              {spot.status}
                            </span>
                            <p className="text-sm font-medium text-gray-900 mt-1">${spot.price}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Your Reserved Spots */}
              {reservedSpots.length > 0 && (
                <div className="bg-white rounded-lg shadow">
                  <div className="px-6 py-4 border-b border-gray-200">
                    <h4 className="font-medium text-gray-900">Your Reservations</h4>
                  </div>
                  <div className="divide-y divide-gray-200">
                    {reservedSpots.slice(0, 3).map((spot) => (
                      <div key={spot.id} className="px-6 py-4">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{spot.address}</p>
                            <p className="text-sm text-gray-600">{spot.city}</p>
                            <p className="text-sm text-gray-500">
                              Reserved {formatDistanceToNow(spot.reservedAt, { addSuffix: true })}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(spot.status)}`}>
                              {spot.status}
                            </span>
                            <p className="text-sm font-medium text-gray-900 mt-1">${spot.price}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Activity */}
              {userSpots.length === 0 && reservedSpots.length === 0 && (
                <div className="bg-white rounded-lg shadow p-6 text-center text-gray-500">
                  No recent activity yet. Start by finding or posting a parking spot!
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
