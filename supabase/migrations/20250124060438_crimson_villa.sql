/*
  # Create entries table with geolocation support

  1. New Tables
    - `entries`
      - `id` (uuid, primary key)
      - `title` (text) - Para name
      - `description` (text) - Entry description
      - `pincode` (text) - Area pincode
      - `location` (geography) - Geolocation point
      - `tags` (text[]) - Array of tags
      - `user_id` (uuid) - Reference to auth.users
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `entries` table
    - Add policy for authenticated users to read all entries
    - Add policy for users to insert their own entries
*/

CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TABLE IF NOT EXISTS entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL,
  pincode text NOT NULL,
  location geography(Point, 4326) NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  user_id uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

-- Create index for geospatial queries
CREATE INDEX IF NOT EXISTS entries_location_idx ON entries USING GIST (location);

-- Enable RLS
ALTER TABLE entries ENABLE ROW LEVEL SECURITY;

-- Policy for reading entries (anyone can read)
CREATE POLICY "Anyone can read entries"
  ON entries
  FOR SELECT
  USING (true);

-- Policy for inserting entries (authenticated users only)
CREATE POLICY "Users can insert their own entries"
  ON entries
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);