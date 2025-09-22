import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, COLLECTIONS, APP_CONSTANTS } from '../../firebase/config';
import Navigation from '../Navigation/Navigation';

const PostSpot = ({ user }) => {
  const navigate = useNavigate();
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
  const [locationVerifying, setLocationVerifying] = useState(false);
  const [locationVerified, setLocationVerified] = useState(false);
  const [gpsError, setGpsError] = useState('');

  // Get user's current location
  useEffect(() => {
    const lat = sessionStorage.getItem('userLatitude');
    const lng = sessionStorage.getItem('userLongitude');
    if (lat && lng) {
      setUserLocation({ lat: parseFloat(lat), lng: parseFloat(lng) });
    }
  }, []);

  // Calculate distance between two coordinates using Haversine formula
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  };

  // Geocode address using a free geocoding service
  const geocodeAddress = async (address, city) => {
    try {
      const fullAddress = `${address}, ${city}`;
      const encodedAddress = encodeURIComponent(fullAddress);
      
      // Using Nominatim (OpenStreetMap) - free geocoding service
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1`
      );
      
      if (!response.ok) {
        throw new Error('Geocoding service unavailable');
      }
      
      const data = await response.json();
      
      if (data.length === 0) {
        throw new Error('Address not found. Please check the address and try again.');
      }
      
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon)
      };
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error('Could not verify address location. Please check the address.');
    }
  };

  // Get user's current GPS location
  const getCurrentLocation = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          switch(error.code) {
            case error.PERMISSION_DENIED:
              reject(new Error('Location access denied. Please enable location services and try again.'));
              break;
            case error.POSITION_UNAVAILABLE:
              reject(new Error('Location information is unavailable.'));
              break;
            case error.TIMEOUT:
              reject(new Error('Location request timed out.'));
              break;
            default:
              reject(new Error('An unknown error occurred while getting location.'));
              break;
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes
        }
      );
    });
  };

  // Verify user is at the posted location
  const verifyLocation = async () => {
    if (!formData.address.trim() || !formData.city.trim()) {
      setGpsError('Please enter address and city first');
      return;
    }

    setLocationVerifying(true);
    setGpsError('');
    setLocationVerified(false);

    try {
      // Get current GPS location
      const currentLocation = await getCurrentLocation();
      
      // Geocode the entered address
      const addressLocation = await geocodeAddress(formData.address, formData.city);
      
      // Calculate distance between user and address
      const distance = calculateDistance(
        currentLocation.lat,
        currentLocation.lng,
        addressLocation.lat,
        addressLocation.lng
      );

      console.log(`Distance to address: ${distance.toFixed(1)} meters`);

      // Allow up to 200 feet (61 meters) tolerance
      const MAX_DISTANCE = 61; // 200 feet in meters
      
      if (distance <= MAX_DISTANCE) {
        setLocationVerified(true);
        setUserLocation(addressLocation); // Store the verified address location
        setGpsError('');
      } else {
        setLocationVerified(false);
        setGpsError(`You must be within 200 feet of the parking spot to post it. You are currently ${Math.round(distance * 3.28)} feet away.`);
      }
    } catch (error) {
      console.error('Location verification error:', error);
      setGpsError(error.message);
      setLocationVerified(false);
    } finally {
      setLocationVerifying(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
    if (success) setSuccess('');
    
    // Reset location verification if address changes
    if (e.target.name === 'address' || e.target.name === 'city') {
      setLocationVerified(false);
      setGpsError('');
    }
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
    if (!locationVerified) {
      setError('Please verify your location before posting');
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

    // Check if time is in the future (with 5 minute buffer)
    const selectedTime = new Date(formData.availableAt);
    const now = new Date();
    const fiveMinutesFromNow = new Date(now.getTime() + (5 * 60 * 1000));
    
    if (selectedTime < fiveMinutesFromNow) {
      setError('Available time must be at least 5 minutes from now');
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
        
        // Verified location
        location: userLocation,
        locationVerified: true,
        
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
      setLocationVerified(false);

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        navigate('/dashboard');
      }, 2000);

    } catch (error) {
      console.error('Error posting spot:', error);
      setError('Failed to post parking spot. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Generate minimum time (5 minutes from now)
  const getMinTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 5);
    return now.toISOString().slice(0, 16); // Format for datetime-local input
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
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

              {/* GPS Verification */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3 flex-1">
                    <h4 className="text-sm font-medium text-blue-800">
                      Location Verification Required
                    </h4>
                    <p className="mt-1 text-sm text-blue-700">
                      To prevent fraud, you must be within 200 feet of the parking spot to post it.
                    </p>
                    
                    {/* GPS Error Message */}
                    {gpsError && (
                      <div className="mt-2 text-sm text-red-600">
                        {gpsError}
                      </div>
                    )}
                    
                    {/* Verification Status */}
                    {locationVerified && (
                      <div className="mt-2 flex items-center text-sm text-green-600">
                        <svg className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        Location verified! You can now post this spot.
                      </div>
                    )}
                    
                    <button
                      type="button"
                      onClick={verifyLocation}
                      disabled={locationVerifying || !formData.address.trim() || !formData.city.trim()}
                      className="mt-3 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {locationVerifying ? 'Verifying Location...' : 'Verify My Location'}
                    </button>
                  </div>
                </div>
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
                disabled={loading || !locationVerified}
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
