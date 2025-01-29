import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Header } from './components/Header';
import { LocationDetector } from './components/LocationDetector';
import { ParaNameInput } from './components/ParaNameInput';
import { ExperienceInputs } from './components/ExperienceInputs';
import { GeneratedContent } from './components/GeneratedContent';
import { RightPanel } from './components/RightPanel';
import { OnboardingModal } from './components/OnboardingModal';
import { ProgressBar } from './components/ProgressBar';
import { Auth } from './components/Auth';
import { ImageGeneration } from './components/ImageGeneration';
import { SuccessModal } from './components/SuccessModal';
import { Toast } from './components/Toast';
import { useStore } from './store/useStore';
import { Save, RefreshCw } from 'lucide-react';
import { supabase } from './utils/supabase';

function MainPage() {
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const navigate = useNavigate();

  const {
    location,
    paraName,
    selectedTags,
    experiences,
    generatedContent,
    user,
    addEntry,
    clearForm,
    setUser
  } = useStore();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, [setUser]);

  const handleSave = async () => {
    // Check for minimum required data
    if (!location.area || !paraName || !generatedContent) {
      return;
    }

    // Validate experiences
    const validExperiences = experiences.filter(exp => exp.content.trim().length > 0);
    if (validExperiences.length === 0) {
      alert('Please share at least one experience about your para');
      return;
    }

    if (!user) {
      alert('Please sign in to save your entry');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('entries')
        .insert({
          title: paraName,
          description: generatedContent,
          pincode: location.pincode,
          location: `POINT(${location.lng} ${location.lat})`,
          tags: selectedTags.length > 0 ? selectedTags : validExperiences.map((_, i) => `Experience ${i + 1}`),
          user_id: user.id
        })
        .select()
        .single();

      if (error) throw error;

      addEntry({
        id: data.id,
        paraName,
        location,
        tags: selectedTags.length > 0 ? selectedTags : validExperiences.map((_, i) => `Experience ${i + 1}`),
        experiences: validExperiences,
        generatedContent,
        timestamp: Date.now()
      });

      // Clear the form immediately after successful save
      clearForm();

      // Show success toast
      setToastMessage('Your para has been successfully submitted!');
      setShowToast(true);

      // Show modal after delay
      setTimeout(() => {
        setShowSuccessModal(true);
      }, 1000);
    } catch (error) {
      console.error('Error saving entry:', error);
      alert('Failed to save entry. Please try again.');
    }
  };

  const handleMaybeLater = () => {
    setShowSuccessModal(false); // Close the modal
    setShowToast(true);
    setToastMessage('Want to create a visual portrait of your para?');
  };

  const handleCreateImage = () => {
    setShowSuccessModal(false); // Also close modal when navigating
    navigate('/image-generation', {
      state: {
        tags: selectedTags,
        experiences: experiences.filter(exp => exp.content.trim().length > 0),
        location,
        paraName,
        generatedContent
      }
    });
  };

  const canSave =
    location.area &&
    paraName &&
    generatedContent &&
    experiences.some(exp => exp.content.trim().length > 0);

  return (
    <div className="min-h-screen bg-gray-100">
      {!user && <Auth />}
      <OnboardingModal />
      <Header />

      <main className="container mx-auto px-4 py-20">
        <ProgressBar />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Panel */}
          <div className="lg:sticky lg:top-20 h-auto lg:h-[calc(100vh-5rem)] overflow-y-auto scrollbar-container space-y-6">
            <LocationDetector />
            <ParaNameInput />
            <ExperienceInputs />
            <GeneratedContent />

            <div className="flex space-x-4 lg:sticky bottom-0 bg-gray-100 p-4">
              <button
                onClick={handleSave}
                disabled={!canSave || !user}
                className="flex-1 flex items-center justify-center space-x-2 bg-rose-600 
                         hover:bg-rose-700 text-white py-2 px-4 rounded-md 
                         transition-colors disabled:opacity-50"
              >
                <Save className="w-5 h-5" />
                <span>Save Entry</span>
              </button>

              <button
                onClick={clearForm}
                className="flex items-center justify-center space-x-2 bg-gray-200 
                         hover:bg-gray-300 text-gray-800 py-2 px-4 rounded-md 
                         transition-colors"
              >
                <RefreshCw className="w-5 h-5" />
                <span>Clear</span>
              </button>
            </div>
          </div>

          {/* Right Panel */}
          <div className="lg:pl-6">
            <RightPanel />
          </div>
        </div>
      </main>

      {showSuccessModal && (
        <SuccessModal
          onClose={() => setShowSuccessModal(false)}
          onMaybeLater={handleMaybeLater}
          onCreateImage={handleCreateImage}
        />
      )}

      {showToast && (
        <Toast
          message={toastMessage}
          actionLabel={toastMessage.includes('Want to create') ? 'Create Now' : undefined}
          onAction={handleCreateImage}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route path="/image-generation" element={<ImageGeneration />} />
      </Routes>
    </Router>
  );
}

export default App;