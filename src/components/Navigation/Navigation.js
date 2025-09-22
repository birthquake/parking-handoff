import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/config';

const Navigation = ({ user }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="container">
        <div className="flex justify-between h-16">
          {/* Logo and hamburger */}
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-blue-600">
              🚗 ParkingSpot
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="nav-desktop-menu space-x-4 items-center">
            <Link
              to="/dashboard"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/dashboard')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </Link>
            
            <Link
              to="/find-spots"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/find-spots')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Find Spots
            </Link>
            
            <Link
              to="/post-spot"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/post-spot')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Post Spot
            </Link>
            
            <Link
              to="/my-spots"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/my-spots')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              My Spots
            </Link>
            
            <Link
              to="/messages"
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                isActive('/messages')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Messages
            </Link>

            <span className="text-sm text-gray-700">
              {user?.email}
            </span>
            
            <button
              onClick={handleSignOut}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
            >
              Sign Out
            </button>
          </div>

          {/* Mobile menu button */}
          <div className="nav-mobile-menu flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="text-gray-500 hover:text-gray-700 p-2"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileMenuOpen && (
        <div className="nav-mobile-menu border-t border-gray-200">
          <div className="px-2 pt-2 pb-3 space-y-1">
            <Link
              to="/dashboard"
              onClick={closeMobileMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/dashboard')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Dashboard
            </Link>
            
            <Link
              to="/find-spots"
              onClick={closeMobileMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/find-spots')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Find Spots
            </Link>
            
            <Link
              to="/post-spot"
              onClick={closeMobileMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/post-spot')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Post Spot
            </Link>
            
            <Link
              to="/my-spots"
              onClick={closeMobileMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/my-spots')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              My Spots
            </Link>
            
            <Link
              to="/messages"
              onClick={closeMobileMenu}
              className={`block px-3 py-2 rounded-md text-base font-medium ${
                isActive('/messages')
                  ? 'text-blue-600 bg-blue-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Messages
            </Link>

            <div className="border-t border-gray-200 pt-3 mt-3">
              <div className="px-3 py-2 text-sm text-gray-500">
                {user?.email}
              </div>
              <button
                onClick={handleSignOut}
                className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-gray-500 hover:text-gray-700 hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;
