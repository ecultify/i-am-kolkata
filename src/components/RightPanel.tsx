import React, { useEffect, useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { useStore } from '../store/useStore';
import { getNearbyEntries } from '../utils/supabase';
import { EntryCards } from './EntryCards';

const MAX_ENTRIES = 20;

interface NearbyEntry {
  id: string;
  title: string;
  description: string;
  pincode: string;
  tags: string[];
  created_at: string;
  distance_km: number;
}

export const RightPanel: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [entries, setEntries] = useState<NearbyEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const location = useStore(state => state.location);

  const fetchEntries = async () => {
    if (!location.lat || !location.lng) return;
    
    setLoading(true);
    setError(null);
    try {
      const nearbyEntries = await getNearbyEntries(location.lat, location.lng);
      setEntries(nearbyEntries?.slice(0, MAX_ENTRIES) || []);
    } catch (error) {
      console.error('Failed to fetch nearby entries:', error);
      setError('Failed to load nearby entries');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [location.lat, location.lng]);

  if (!location.lat || !location.lng) {
    return (
      <div className="lg:sticky lg:top-20 h-auto lg:h-[calc(100vh-5rem)] bg-gray-50 rounded-lg shadow-sm">
        <div className="p-4">
          <p className="text-gray-500 text-center">
            Enable location to see nearby entries
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="lg:sticky lg:top-20 h-auto lg:h-[calc(100vh-5rem)] bg-gray-50 rounded-lg shadow-sm flex flex-col">
      <div className="flex-none p-4 border-b bg-white rounded-t-lg">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Nearby Entries</h2>
          <div className="flex items-center space-x-2">
            {error && (
              <p className="text-sm text-red-600">{error}</p>
            )}
            <button
              onClick={fetchEntries}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50
                       rounded-full hover:bg-gray-100 transition-colors"
              title="Refresh entries"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-container">
        {loading && entries.length === 0 ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-rose-600" />
          </div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No entries found near you. Be the first to add one!
            </p>
            <button 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
              className="text-rose-600 hover:text-rose-700 font-medium"
            >
              Create New Entry
            </button>
          </div>
        ) : (
          <div className="p-4">
            <EntryCards entries={entries} />
          </div>
        )}
      </div>
    </div>
  );
};