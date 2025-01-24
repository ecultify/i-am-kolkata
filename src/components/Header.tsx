import React from 'react';
import { MapPin, LogOut, Camera, User } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store/useStore';
import { supabase } from '../utils/supabase';

export const Header: React.FC = () => {
  const { user, setUser } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const handleImageGenClick = () => {
    if (location.pathname === '/') {
      // Show a message to create para entry first
      alert('Please create and save your para entry first to generate a portrait!');
    }
  };

  return (
    <header className="fixed top-0 left-0 right-0 bg-white shadow-md z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MapPin className="w-8 h-8 text-rose-600" />
            <h1 className="text-2xl font-bold text-gray-800">I Am Kolkata</h1>
          </div>

          <div className="flex items-center space-x-6">
            <p className="text-sm text-gray-600 italic hidden sm:block">
              Preserving Para Culture
            </p>

            {user && (
              <>
                <button
                  onClick={handleImageGenClick}
                  className={`flex items-center space-x-2 text-gray-600 hover:text-gray-800 
                           ${location.pathname === '/image-generation' ? 'text-rose-600' : ''}`}
                >
                  <Camera className="w-5 h-5" />
                  <span className="text-sm hidden sm:inline">Para Portrait</span>
                </button>

                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2 text-gray-600">
                    <User className="w-5 h-5" />
                    <span className="text-sm hidden sm:inline">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>

                  <button
                    onClick={handleLogout}
                    className="flex items-center space-x-1 text-gray-600 hover:text-gray-800"
                  >
                    <LogOut className="w-5 h-5" />
                    <span className="text-sm hidden sm:inline">Logout</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};