import React, { useState } from 'react';
import { MapPin, Loader2, Settings } from 'lucide-react';
import { useStore } from '../store/useStore';

export const LocationDetector: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<PermissionState | null>(null);
  const { location, setLocation } = useStore(state => ({
    location: state.location,
    setLocation: state.setLocation
  }));

  const checkPermissions = async () => {
    try {
      // Check if the permissions API is available
      if ('permissions' in navigator) {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        setPermissionState(result.state);
        
        // Listen for permission changes
        result.addEventListener('change', () => {
          setPermissionState(result.state);
          if (result.state === 'granted') {
            detectLocation();
          }
        });

        return result.state;
      }
      return null;
    } catch (err) {
      console.warn('Permissions API not supported');
      return null;
    }
  };

  const getAreaDetails = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
        {
          headers: {
            'Accept-Language': 'en'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch location details');
      }

      const data = await response.json();
      
      const area = data.address.suburb || 
                  data.address.neighbourhood || 
                  data.address.city_district ||
                  data.address.city || 
                  'Unknown Area';
                  
      const pincode = data.address.postcode || 'Unknown Pincode';
      
      return { area, pincode };
    } catch (err) {
      console.error('Error getting area details:', err);
      throw new Error('Failed to get location details');
    }
  };

  const detectLocation = async () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Check permissions first
    const permState = await checkPermissions();
    if (permState === 'denied') {
      setError('Location access is blocked. Please enable location access in your browser settings.');
      setLoading(false);
      return;
    }

    const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 60000,
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions);
    });

    const attemptGeolocation = async (retries = 3, baseDelay = 2000) => {
      for (let i = 0; i < retries; i++) {
        try {
          const position = await getPosition();
          const { latitude: lat, longitude: lng } = position.coords;
          const { area, pincode } = await getAreaDetails(lat, lng);
          
          setLocation({
            pincode,
            area,
            lat,
            lng
          });
          setLoading(false);
          return;
        } catch (err: any) {
          console.warn(`Geolocation attempt ${i + 1} failed:`, err);
          
          if (i === retries - 1) {
            let errorMessage = '';
            
            if (err instanceof GeolocationPositionError) {
              switch (err.code) {
                case err.PERMISSION_DENIED:
                  errorMessage = 'Location access is denied. Please check your:';
                  break;
                case err.POSITION_UNAVAILABLE:
                  errorMessage = 'Unable to detect location. Please check your:';
                  break;
                case err.TIMEOUT:
                  errorMessage = 'Location request timed out. Please check your:';
                  break;
                default:
                  errorMessage = 'Location detection failed. Please check your:';
              }
            } else {
              errorMessage = 'Failed to get location. Please check your:';
            }
            
            setError(errorMessage);
            setLoading(false);
            return;
          }
          
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
        }
      }
    };

    attemptGeolocation();
  };

  const renderErrorHelp = () => {
    if (!error) return null;

    return (
      <div className="mt-4 p-4 bg-red-50 rounded-md space-y-2">
        <p className="text-sm text-red-600 font-medium">{error}</p>
        <ul className="text-sm text-red-600 list-disc pl-5">
          <li>Browser location permissions (check the location icon in your address bar)</li>
          <li>Device location services are enabled</li>
          <li>GPS is turned on (for mobile devices)</li>
          <li>Internet connection is stable</li>
        </ul>
        {permissionState === 'denied' && (
          <div className="mt-2 flex items-center space-x-2">
            <Settings className="w-4 h-4 text-red-600" />
            <a 
              href="#" 
              onClick={(e) => {
                e.preventDefault();
                window.open('chrome://settings/content/location');
              }}
              className="text-sm text-red-600 underline"
            >
              Open Browser Settings
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-sm">
      <h2 className="text-lg font-semibold mb-4">Location</h2>
      
      <button
        onClick={detectLocation}
        disabled={loading}
        className="w-full flex items-center justify-center space-x-2 bg-rose-600 hover:bg-rose-700 
                   text-white py-2 px-4 rounded-md transition-colors disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" />
        ) : (
          <MapPin className="w-5 h-5" />
        )}
        <span>{location.area ? 'Update Location' : 'Locate Me'}</span>
      </button>

      {renderErrorHelp()}

      {location.area && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <p className="text-sm text-gray-600">
            <span className="font-medium">Street name:</span> {location.area}
          </p>
          <p className="text-sm text-gray-600">
            <span className="font-medium">Pincode:</span> {location.pincode}
          </p>
        </div>
      )}
    </div>
  );
};