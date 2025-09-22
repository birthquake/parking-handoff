import React from 'react';
import { Link } from 'react-router-dom';
import Navigation from '../Navigation/Navigation';

const Dashboard = ({ user }) => {
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

        <div className="mt-8">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Recent Activity
          </h3>
          <div className="bg-white rounded-lg shadow">
            <div className="p-6 text-center text-gray-500">
              No recent activity yet. Start by finding or posting a parking spot!
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
