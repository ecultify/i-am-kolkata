import React, { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { useStore } from '../store/useStore';

export const LocationDetector: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { location, setLocation } = useStore(state => ({
    location: state.location,
    setLocation: state.setLocation
  }));

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
      
      // Extract area details from Nominatim response
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

  const detectLocation = () => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setLoading(false);
      return;
    }

    // Create a promise-based geolocation request with timeout
    const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
      const geoOptions = {
        enableHighAccuracy: true,
        timeout: 60000, // Increased to 60 seconds
        maximumAge: 0
      };

      navigator.geolocation.getCurrentPosition(resolve, reject, geoOptions);
    });

    // Implement retry logic with exponential backoff
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
            // Last retry failed
            let errorMessage = 'Failed to get your location. ';
            
            if (err instanceof GeolocationPositionError) {
              switch (err.code) {
                case err.PERMISSION_DENIED:
                  errorMessage += 'Please enable location permissions in your browser settings.';
                  break;
                case err.POSITION_UNAVAILABLE:
                  errorMessage += 'Location information is unavailable.';
                  break;
                case err.TIMEOUT:
                  errorMessage += 'Location request timed out. Please try again.';
                  break;
                default:
                  errorMessage += 'Please try again.';
              }
            } else {
              errorMessage += err.message || 'Please try again.';
            }
            
            setError(errorMessage);
            setLoading(false);
            return;
          }
          
          // Wait with exponential backoff before retrying
          await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, i)));
        }
      }
    };

    attemptGeolocation();
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

      {error && (
        <p className="mt-2 text-sm text-red-600">{error}</p>
      )}

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