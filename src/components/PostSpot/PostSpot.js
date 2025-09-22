import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, APP_CONSTANTS } from '../../firebase/config';

const PostSpot = ({ user }) => {
  const [formData, setFormData] = useState({
    address: '',
    city: '',
    price: '',
    availableAt: '',
    description: '',
    spotType: 'street',
    duration: '30'
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [userLocation, setUserLocation] = useState(null);

  // Get user's current location
  useEffect(() => {
    const lat = sessionStorage.getItem('userLatitude');
    const lng = sessionStorage.getItem('userLongitude');
    if (lat && lng) {
      setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  }, []);

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
    if (success) setSuccess('');
  };

  const validateForm = () => {
    if (!formData.address.trim()) {
      setError('Street address is required');
      return false;
    }
    if (!formData.city.trim()) {
      setError('City is required');
      return false;
    }
    if (!formData.price || parseFloat(formData.price) < APP_CONSTANTS.MIN_PRICE) {
      setError(`Price must be at least $${APP_CONSTANTS.MIN_PRICE}`);
      return false;
    }
    if (parseFloat(formData.price) > APP_CONSTANTS.MAX_PRICE) {
      setError(`Price cannot exceed $${APP_CONSTANTS.MAX_PRICE}`);
      return false;
    }
    if (!formData.availableAt) {
      setError('Available time is required');
      return false;
    }

    // Check if time is in the future
    const selectedTime = new Date(formData.availableAt);
    const now = new Date();
    if (selectedTime <= now) {
      setError('Available time must be in the future');
      return false;
    }

    // Check if time is not too far in the future (max 4 hours)
    const maxTime = new Date(now.getTime() + (4 * 60 * 60 * 1000));
    if (selectedTime > maxTime) {
      setError('Available time cannot be more than 4 hours from now');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    setError('');

    try {
      const spotData = {
        // Spot details
        address: formData.address.trim(),
        city: formData.city.trim(),
        price: parseFloat(formData.price),
        description: formData.description.trim(),
        spotType: formData.spotType,
        
        // Timing
        availableAt: new Date(formData.availableAt),
        duration: parseInt(formData.duration),
        expiresAt: new Date(Date.now() + (APP_CONSTANTS.MAX_SPOT_DURATION * 60 * 1000)),
        
        // User info
        ownerId: user.uid,
        ownerEmail: user.email,
        
        // Location (approximate for now, we'll add maps later)
        location: userLocation || { lat: 37.7749, lng: -122.4194 }, // Default to SF
        
        // Status
        status: 'available', // available, reserved, completed, cancelled
        
        // Metadata
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        handoffCount: 0
      };

      // Add to Firestore
      const docRef = await addDoc(collection(db, COLLECTIONS.SPOTS), spotData);
      console.log('Spot posted with ID:', docRef.id);

      setSuccess('Parking spot posted successfully! 🎉');
      
      // Reset form
      setFormData({
        address: '',
        city: '',
        price: '',
        availableAt: '',
        description: '',
        spotType: 'street',
        duration: '30'
      });

    } catch (error) {
      console.error('Error posting spot:', error);
      setError('Failed to post parking spot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate default time (30 minutes from now)
  const getDefaultTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 30);
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            Post Your Parking Spot
          </h1>
          <p className="mt-2 text-gray-600">
            Share your parking spot with others and earn some cash!
          </p>
        </div>

        <div className="bg-white rounded-lg shadow">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            
            {/* Success Message */}
            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
                {success}
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                {error}
              </div>
            )}

            {/* Location Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">📍 Location</h3>
              
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                  Street Address *
                </label>
                <input
                  type="text"
                  id="address"
                  name="address"
                  required
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="123 Main Street"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  required
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="San Francisco"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Spot Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">🚗 Spot Details</h3>
              
              <div>
                <label htmlFor="spotType" className="block text-sm font-medium text-gray-700">
                  Spot Type
                </label>
                <select
                  id="spotType"
                  name="spotType"
                  value={formData.spotType}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="street">Street Parking</option>
                  <option value="garage">Parking Garage</option>
                  <option value="lot">Parking Lot</option>
                  <option value="driveway">Driveway</option>
                </select>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Description (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Any specific instructions or details about the spot..."
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Timing & Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900">⏰ Timing & Price</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="availableAt" className="block text-sm font-medium text-gray-700">
                    Available At *
                  </label>
                  <input
                    type="datetime-local"
                    id="availableAt"
                    name="availableAt"
                    required
                    value={formData.availableAt}
                    onChange={handleInputChange}
                    min={new Date().toISOString().slice(0, 16)}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="duration" className="block text-sm font-medium text-gray-700">
                    Available For
                  </label>
                  <select
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="15">15 minutes</option>
                    <option value="30">30 minutes</option>
                    <option value="45">45 minutes</option>
                    <option value="60">1 hour</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="price" className="block text-sm font-medium text-gray-700">
                  Price ($) *
                </label>
                <input
                  type="number"
                  id="price"
                  name="price"
                  required
                  min={APP_CONSTANTS.MIN_PRICE}
                  max={APP_CONSTANTS.MAX_PRICE}
                  step="0.50"
                  value={formData.price}
                  onChange={handleInputChange}
                  placeholder="5.00"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-sm text-gray-500">
                  Platform takes 25% fee. You'll receive ${formData.price ? (formData.price * 0.75).toFixed(2) : '0.00'}
                </p>
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-md font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Posting Spot...' : 'Post Parking Spot'}
              </button>
            </div>

            {/* Helper Text */}
            <div className="text-sm text-gray-500 text-center">
              💡 Tip: Set your available time for when you'll actually be leaving to ensure a smooth handoff!
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PostSpot;
