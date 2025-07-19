'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { RitualSubmissionForm } from '@/components/RitualSubmissionForm';
import { BioregionSelector } from '@/components/BioregionSelector';
import { ValidationResults } from '@/components/ValidationResults';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';

export default function Home() {
  const [selectedBioregion, setSelectedBioregion] = useState<string>('');
  const [submissionResult, setSubmissionResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const bioregions = [
    {
      id: 'tech-haven',
      name: 'Tech Haven',
      description:
        'Digital innovation, sustainable technology, and urban regeneration',
      image: '/images/tech-haven.jpg',
    },
    {
      id: 'mythic-forest',
      name: 'Mythic Forest',
      description: 'Ancient wisdom, biodiversity, and spiritual connection',
      image: '/images/mythic-forest.jpg',
    },
    {
      id: 'isolated-bastion',
      name: 'Isolated Bastion',
      description: 'Self-sufficiency, resilience, and community autonomy',
      image: '/images/isolated-bastion.jpg',
    },
  ];

  const handleRitualSubmission = async (formData: FormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/rituals/submit`,
        {
          method: 'POST',
          body: formData,
        },
      );

      if (response.ok) {
        const result = await response.json();
        setSubmissionResult(result);
      } else {
        const error = await response.json();
        throw new Error(error.details || 'Submission failed');
      }
    } catch (error) {
      console.error('Submission error:', error);
      setSubmissionResult({
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50'>
      <Header />

      <main className='container mx-auto px-4 py-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='text-center mb-12'
        >
          <h1 className='text-4xl md:text-6xl font-bold text-gray-900 mb-4'>
            Global Regeneration Ceremony
          </h1>
          <p className='text-xl text-gray-600 max-w-3xl mx-auto'>
            Submit your bioregional regeneration ritual for validation and join
            the global movement towards cultural authenticity and ecological
            harmony.
          </p>
        </motion.div>

        <div className='grid lg:grid-cols-2 gap-8 max-w-7xl mx-auto'>
          {/* Left Column - Bioregion Selection */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className='space-y-6'
          >
            <div className='bg-white rounded-2xl shadow-xl p-6'>
              <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
                Choose Your Bioregion
              </h2>
              <BioregionSelector
                bioregions={bioregions}
                selectedBioregion={selectedBioregion}
                onSelectBioregion={setSelectedBioregion}
              />
            </div>

            {selectedBioregion && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className='bg-white rounded-2xl shadow-xl p-6'
              >
                <h3 className='text-xl font-semibold text-gray-900 mb-3'>
                  Bioregion Information
                </h3>
                <div className='space-y-3'>
                  {bioregions.find((b) => b.id === selectedBioregion) && (
                    <>
                      <p className='text-gray-700'>
                        {
                          bioregions.find((b) => b.id === selectedBioregion)
                            ?.description
                        }
                      </p>
                      <div className='flex items-center space-x-2 text-sm text-gray-500'>
                        <span>🌱</span>
                        <span>
                          Cultural traditions and ecological practices
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>

          {/* Right Column - Ritual Submission */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className='space-y-6'
          >
            <div className='bg-white rounded-2xl shadow-xl p-6'>
              <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
                Submit Your Ritual
              </h2>
              <RitualSubmissionForm
                selectedBioregion={selectedBioregion}
                onSubmit={handleRitualSubmission}
                isSubmitting={isSubmitting}
              />
            </div>

            {submissionResult && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <ValidationResults result={submissionResult} />
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Information Section */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className='mt-16 bg-white rounded-2xl shadow-xl p-8'
        >
          <h2 className='text-3xl font-bold text-gray-900 mb-6 text-center'>
            How It Works
          </h2>
          <div className='grid md:grid-cols-3 gap-8'>
            <div className='text-center'>
              <div className='w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>📝</span>
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                Submit Ritual
              </h3>
              <p className='text-gray-600'>
                Upload your .grc ritual file with cultural context and
                bioregional information.
              </p>
            </div>
            <div className='text-center'>
              <div className='w-16 h-16 bg-teal-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>🔍</span>
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                AI Validation
              </h3>
              <p className='text-gray-600'>
                Our ESEP and CEDA filters validate ethical-spiritual balance and
                cultural authenticity.
              </p>
            </div>
            <div className='text-center'>
              <div className='w-16 h-16 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-4'>
                <span className='text-2xl'>🌐</span>
              </div>
              <h3 className='text-xl font-semibold text-gray-900 mb-2'>
                Global Registry
              </h3>
              <p className='text-gray-600'>
                Approved rituals are stored on IPFS and logged on Base testnet
                for transparency.
              </p>
            </div>
          </div>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
}
