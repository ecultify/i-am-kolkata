import React from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Entry {
  id: string;
  title: string;
  description: string;
  pincode: string;
  tags: string[];
  created_at: string;
  distance_km: number;
  isNew?: boolean;
}

interface EntryCardsProps {
  entries: Entry[];
}

export const EntryCards: React.FC<EntryCardsProps> = ({ entries = [] }) => {
  if (!entries || entries.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 italic">No entries found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {entries.map((entry) => (
        <div
          key={entry.id}
          className={`bg-white rounded-lg shadow-sm p-4 transition-all duration-500
                     hover:shadow-md ${entry.isNew ? 'animate-highlight ring-2 ring-rose-500' : ''}`}
        >
          <h3 className="text-xl font-semibold text-gray-800 mb-2">
            {entry.title}
          </h3>

          <div className="flex items-center text-sm text-gray-600 mb-3">
            <MapPin className="w-4 h-4 mr-1" />
            <span>{entry.distance_km.toFixed(1)} km away</span>
            <span className="mx-2">•</span>
            <span className="text-gray-500">{entry.pincode}</span>
            <span className="mx-2">•</span>
            <Calendar className="w-4 h-4 mr-1" />
            <span>{formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}</span>
          </div>

          <div className="prose prose-sm max-w-none mb-3">
            {entry.description}
          </div>

          <div className="flex flex-wrap gap-2">
            {entry.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs
                         font-medium bg-gray-100 text-gray-800"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};