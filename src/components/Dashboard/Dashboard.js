import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../firebase/config';
import { format, formatDistanceToNow } from 'date-fns';
import Navigation from '../Navigation/Navigation';

const Dashboard = ({ user }) => {
  const [userSpots, setUserSpots] = useState([]);
  const [reservedSpots, setReservedSpots] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get all spots and filter in JavaScript to avoid index requirements
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
        
        // Filter spots posted by this user
        if (spot.ownerId === user.uid) {
          userPostedSpots.push(spot);
        }
        
        // Filter spots reserved by this user
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
    }, (error) => {
      console.error('Error fetching dashboard data:', error);
      setLoading(false);
    });

    return () => unsubscribe();
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
      
      <div className="container">
        <div className="py-responsive">
          <h1 className="text-responsive-xl font-bold text-gray-900">
            Welcome back!
          </h1>
          <p className="mt-2 text-gray-600">
            Find parking spots or post your own spot for handoff.
          </p>
        </div>

        <div className="grid-responsive grid-responsive-2 mt-6">
          {/* Find Spots Card */}
          <div className="card-responsive">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              🔍 Find Parking Spots
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
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
          <div className="card-responsive">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              📍 Post Your Spot
            </h2>
            <p className="text-gray-600 mb-4 text-sm">
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
