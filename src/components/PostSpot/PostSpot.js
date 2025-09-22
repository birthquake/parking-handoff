import React from 'react';

const PostSpot = ({ user }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Post Your Parking Spot
          </h1>
          <p className="mt-2 text-gray-600">
            Share your parking spot with others who need it.
          </p>
        </div>

        <div className="mt-8">
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              🚧 Coming Soon
            </h2>
            <p className="text-gray-600">
              Spot posting functionality will be available soon!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostSpot;
