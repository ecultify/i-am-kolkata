import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export const getNearbyEntries = async (lat: number, lng: number, radiusKm: number = 4) => {
  try {
    const { data, error } = await supabase
      .rpc('get_nearby_entries', {
        lat_param: lat,
        lng_param: lng,
        radius_km: radiusKm
      });

    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching nearby entries:', error);
    return [];
  }
};