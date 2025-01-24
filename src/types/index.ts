export interface Location {
  pincode: string;
  area: string;
  actualArea?: string; // Added for internal area tracking
  lat: number;
  lng: number;
}

export interface Experience {
  tag: string;
  content: string;
}

export interface ParaEntry {
  id: string;
  paraName: string;
  location: Location;
  tags: string[];
  experiences: Experience[];
  generatedContent: string;
  timestamp: number;
}