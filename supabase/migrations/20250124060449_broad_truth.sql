/*
  # Create function for fetching nearby entries

  1. New Function
    - `get_nearby_entries`
      - Parameters:
        - lat_param (float8) - Latitude
        - lng_param (float8) - Longitude
        - radius_km (float8) - Search radius in kilometers
      - Returns: Table of nearby entries with distance
*/

CREATE OR REPLACE FUNCTION get_nearby_entries(
  lat_param float8,
  lng_param float8,
  radius_km float8
)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  pincode text,
  tags text[],
  created_at timestamptz,
  distance_km float8
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id,
    e.title,
    e.description,
    e.pincode,
    e.tags,
    e.created_at,
    ST_Distance(
      e.location::geography,
      ST_SetSRID(ST_MakePoint(lng_param, lat_param), 4326)::geography
    ) / 1000 AS distance_km
  FROM entries e
  WHERE ST_DWithin(
    e.location::geography,
    ST_SetSRID(ST_MakePoint(lng_param, lat_param), 4326)::geography,
    radius_km * 1000
  )
  ORDER BY e.created_at DESC;
END;
$$;