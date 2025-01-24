import { create } from 'zustand';
import { Location, Experience, ParaEntry } from '../types';
import { User } from '@supabase/supabase-js';

interface State {
  location: Location;
  tags: string[];
  selectedTags: string[];
  experiences: Experience[];
  paraName: string;
  generatedContent: string;
  entries: ParaEntry[];
  user: User | null;
  setLocation: (location: Location) => void;
  setTags: (tags: string[]) => void;
  addSelectedTag: (tag: string) => void;
  removeSelectedTag: (tag: string) => void;
  setExperience: (index: number, content: string, tag?: string) => void;
  setParaName: (name: string) => void;
  setGeneratedContent: (content: string) => void;
  addEntry: (entry: ParaEntry) => void;
  clearForm: () => void;
  setUser: (user: User | null) => void;
}

const initialState = {
  location: { pincode: '', area: '', lat: 0, lng: 0 },
  tags: [],
  selectedTags: [],
  experiences: [],
  paraName: '',
  generatedContent: '',
  entries: [],
  user: null,
};

export const useStore = create<State>((set) => ({
  ...initialState,
  
  setLocation: (location) => set({ 
    location,
    tags: [], 
    selectedTags: [],
    experiences: [] 
  }),
  
  setTags: (tags) => set({ tags }),
  
  addSelectedTag: (tag) => 
    set((state) => ({
      selectedTags: state.selectedTags.length < 3 
        ? [...state.selectedTags, tag]
        : state.selectedTags
    })),
    
  removeSelectedTag: (tag) =>
    set((state) => ({
      selectedTags: state.selectedTags.filter((t) => t !== tag),
      experiences: state.experiences.map(exp => 
        exp.tag === tag ? { ...exp, tag: undefined } : exp
      )
    })),
    
  setExperience: (index, content, tag) =>
    set((state) => {
      const newExperiences = [...state.experiences];
      const existingExp = newExperiences[index];
      
      if (existingExp) {
        newExperiences[index] = { ...existingExp, content, tag };
      } else {
        newExperiences[index] = { content, tag };
      }
      
      return { experiences: newExperiences };
    }),
    
  setParaName: (name) => set({ paraName: name }),
  
  setGeneratedContent: (content) => set({ generatedContent: content }),
  
  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries]
    })),
    
  clearForm: () => set((state) => ({ 
    ...initialState,
    location: state.location, // Keep the current location
    tags: state.tags, // Keep available tags for the location
    entries: state.entries, // Keep saved entries
    user: state.user // Keep user authentication state
  })),

  setUser: (user) => set({ user })
}));