import { create } from 'zustand';
import { Location, Experience, ParaEntry } from '../types';
import { User } from '@supabase/supabase-js';

interface ImageGenerationData {
  paraName: string;
  experiences: Experience[];
  location: Location;
  generatedContent: string;
}

interface State {
  location: Location;
  tags: string[];
  selectedTags: string[];
  experiences: Experience[];
  paraName: string;
  generatedContent: string;
  entries: ParaEntry[];
  user: User | null;
  isAIMode: boolean;
  manualDescription: string;
  setLocation: (location: Location) => void;
  setTags: (tags: string[]) => void;
  addSelectedTag: (tag: string) => void;
  removeSelectedTag: (tag: string) => void;
  setExperience: (index: number, content: string, tag?: string) => void;
  setParaName: (name: string) => void;
  setGeneratedContent: (content: string) => void;
  setManualDescription: (description: string) => void;
  addEntry: (entry: ParaEntry) => void;
  clearForm: () => void;
  setUser: (user: User | null) => void;
  setIsAIMode: (isAIMode: boolean) => void;
  setImageGenerationData: (data: ImageGenerationData) => void;
}

const initialState = {
  location: { pincode: '', area: '', lat: 0, lng: 0 },
  tags: [],
  selectedTags: [],
  experiences: [],
  paraName: '',
  generatedContent: '',
  manualDescription: '',
  entries: [],
  user: null,
  isAIMode: false,
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
    set((state) => {
      const emptyIndex = state.experiences.findIndex(exp => !exp?.content || exp.content.trim() === '');
      const targetIndex = emptyIndex !== -1 ? emptyIndex : state.experiences.length;
      
      if (targetIndex >= 3) return state;
      
      const newExperiences = [...state.experiences];
      newExperiences[targetIndex] = { content: tag, tag: tag } as Experience;
      
      return {
        ...state,
        selectedTags: [...state.selectedTags, tag],
        experiences: newExperiences
      };
    }),
    
  removeSelectedTag: (tag) =>
    set((state) => {
      const newExperiences = state.experiences.map(exp => 
        exp?.tag === tag ? { content: '', tag: '' } as Experience : exp
      );
      
      return {
        ...state,
        selectedTags: state.selectedTags.filter((t) => t !== tag),
        experiences: newExperiences
      };
    }),
    
  setExperience: (index, content, tag = '') =>
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
  
  setGeneratedContent: (content) => set((state) => ({
    generatedContent: content,
    // If AI generates content, update the manual description as well
    manualDescription: state.isAIMode ? content : state.manualDescription
  })),

  setManualDescription: (description) => set({ 
    manualDescription: description,
    generatedContent: description // Keep generated content in sync with manual input
  }),
  
  setIsAIMode: (isAIMode) => set({ isAIMode }),
  
  addEntry: (entry) =>
    set((state) => ({
      entries: [entry, ...state.entries]
    })),
    
  clearForm: () => set((state) => ({ 
    ...initialState,
    location: state.location,
    tags: state.tags,
    entries: state.entries,
    user: state.user
  })),

  setUser: (user) => set({ user }),

  setImageGenerationData: (data) => set({
    paraName: data.paraName,
    experiences: data.experiences,
    location: data.location,
    generatedContent: data.generatedContent,
    manualDescription: data.generatedContent // Sync manual description with generated content
  })
}));