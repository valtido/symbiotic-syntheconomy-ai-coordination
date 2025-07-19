'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  FileText,
  Save,
  Upload,
  Download,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
} from 'lucide-react';

// Validation schema for ritual form
const ritualSchema = z.object({
  name: z.string().min(1, 'Ritual name is required').max(100, 'Name too long'),
  bioregionId: z.string().min(1, 'Bioregion selection is required'),
  description: z
    .string()
    .min(10, 'Description must be at least 10 characters')
    .max(500, 'Description too long'),
  culturalContext: z
    .string()
    .min(20, 'Cultural context must be at least 20 characters')
    .max(1000, 'Cultural context too long'),
  content: z
    .string()
    .min(100, 'Ritual content must be at least 100 characters'),
});

type RitualFormData = z.infer<typeof ritualSchema>;

interface ValidationResult {
  esepScore: number;
  cedaScore: number;
  narrativeScore: number;
  isApproved: boolean;
  feedback: string[];
}

export default function RitualDesigner() {
  const [content, setContent] = useState('');
  const [validationResult, setValidationResult] =
    useState<ValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [autoSave, setAutoSave] = useState(true);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RitualFormData>({
    resolver: zodResolver(ritualSchema),
    defaultValues: {
      name: '',
      bioregionId: '',
      description: '',
      culturalContext: '',
      content: '',
    },
  });

  const watchedContent = watch('content');

  // Auto-save functionality
  useEffect(() => {
    if (autoSave && watchedContent) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(
          'grc-ritual-draft',
          JSON.stringify({
            name: watch('name'),
            bioregionId: watch('bioregionId'),
            description: watch('description'),
            culturalContext: watch('culturalContext'),
            content: watchedContent,
            timestamp: new Date().toISOString(),
          }),
        );
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [watchedContent, autoSave, watch]);

  // Load draft on component mount
  useEffect(() => {
    const draft = localStorage.getItem('grc-ritual-draft');
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        setValue('name', parsedDraft.name || '');
        setValue('bioregionId', parsedDraft.bioregionId || '');
        setValue('description', parsedDraft.description || '');
        setValue('culturalContext', parsedDraft.culturalContext || '');
        setValue('content', parsedDraft.content || '');
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, [setValue]);

  // Real-time validation
  useEffect(() => {
    if (watchedContent && watchedContent.length > 100) {
      const timeoutId = setTimeout(() => {
        validateRitual(watchedContent);
      }, 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [watchedContent]);

  const validateRitual = async (ritualContent: string) => {
    setIsValidating(true);
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/rituals/validate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            content: ritualContent,
            bioregionId: watch('bioregionId'),
          }),
        },
      );

      if (response.ok) {
        const result = await response.json();
        setValidationResult(result);
      }
    } catch (error) {
      console.error('Validation error:', error);
    } finally {
      setIsValidating(false);
    }
  };

  const onSubmit = async (data: RitualFormData) => {
    try {
      // Create .grc file content
      const grcContent = generateGRCContent(data);

      // Create and download the file
      const blob = new Blob([grcContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${data.name.replace(/\s+/g, '-').toLowerCase()}.grc`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      // Clear draft after successful submission
      localStorage.removeItem('grc-ritual-draft');

      alert('Ritual file created successfully!');
    } catch (error) {
      console.error('Error creating ritual file:', error);
      alert('Error creating ritual file. Please try again.');
    }
  };

  const generateGRCContent = (data: RitualFormData): string => {
    const bioregionNames = {
      'tech-haven': 'Tech Haven',
      'mythic-forest': 'Mythic Forest',
      'isolated-bastion': 'Isolated Bastion',
    };

    return `# ${data.name}
# Bioregion: ${bioregionNames[data.bioregionId as keyof typeof bioregionNames]}
# Created: ${new Date().toLocaleDateString()}

## Description
${data.description}

## Cultural Context
${data.culturalContext}

## Ritual Content

${data.content}

## Validation Results
${
  validationResult
    ? `
- ESEP Score: ${(validationResult.esepScore * 100).toFixed(1)}%
- CEDA Score: ${validationResult.cedaScore} cultural references
- Narrative Score: ${(validationResult.narrativeScore * 100).toFixed(1)}%
- Approved: ${validationResult.isApproved ? 'Yes' : 'No'}
`
    : 'Pending validation...'
}

---
Generated by Global Regeneration Ceremony Ritual Designer
Symbiotic Syntheconomy v1.0
`;
  };

  const loadFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.name.endsWith('.grc')) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        // Parse .grc file and populate form
        parseGRCFile(content);
      };
      reader.readAsText(file);
    }
  };

  const parseGRCFile = (content: string) => {
    const lines = content.split('\n');
    let name = '';
    let bioregionId = '';
    let description = '';
    let culturalContext = '';
    let ritualContent = '';
    let inContent = false;

    for (const line of lines) {
      if (line.startsWith('# ')) {
        if (line.includes('Bioregion:')) {
          const bioregionName = line.split('Bioregion:')[1]?.trim();
          bioregionId = getBioregionId(bioregionName);
        } else if (!line.includes('Created:') && !line.includes('Bioregion:')) {
          name = line.replace('# ', '').trim();
        }
      } else if (line.startsWith('## Description')) {
        // Skip to next section
      } else if (line.startsWith('## Cultural Context')) {
        // Skip to next section
      } else if (line.startsWith('## Ritual Content')) {
        inContent = true;
      } else if (line.startsWith('## ') && inContent) {
        inContent = false;
      } else if (inContent && line.trim()) {
        ritualContent += line + '\n';
      }
    }

    setValue('name', name);
    setValue('bioregionId', bioregionId);
    setValue('description', description);
    setValue('culturalContext', culturalContext);
    setValue('content', ritualContent.trim());
  };

  const getBioregionId = (name: string): string => {
    const mapping: Record<string, string> = {
      'Tech Haven': 'tech-haven',
      'Mythic Forest': 'mythic-forest',
      'Isolated Bastion': 'isolated-bastion',
    };
    return mapping[name] || '';
  };

  const getValidationStatus = () => {
    if (!validationResult) return 'pending';
    if (validationResult.isApproved) return 'approved';
    return 'rejected';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'text-green-600';
      case 'rejected':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className='w-5 h-5' />;
      case 'rejected':
        return <AlertCircle className='w-5 h-5' />;
      default:
        return <Info className='w-5 h-5' />;
    }
  };

  return (
    <div className='min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50'>
      <div className='container mx-auto px-4 py-8'>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className='max-w-6xl mx-auto'
        >
          {/* Header */}
          <div className='text-center mb-8'>
            <h1 className='text-4xl font-bold text-gray-900 mb-4'>
              Ritual Designer
            </h1>
            <p className='text-xl text-gray-600'>
              Create and validate your bioregional regeneration rituals
            </p>
          </div>

          <div className='grid lg:grid-cols-2 gap-8'>
            {/* Form Section */}
            <div className='space-y-6'>
              <div className='bg-white rounded-2xl shadow-xl p-6'>
                <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
                  Ritual Information
                </h2>

                <form onSubmit={handleSubmit(onSubmit)} className='space-y-4'>
                  {/* Ritual Name */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Ritual Name *
                    </label>
                    <input
                      {...register('name')}
                      type='text'
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      placeholder='Enter ritual name...'
                    />
                    {errors.name && (
                      <p className='text-red-600 text-sm mt-1'>
                        {errors.name.message}
                      </p>
                    )}
                  </div>

                  {/* Bioregion Selection */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Bioregion *
                    </label>
                    <select
                      {...register('bioregionId')}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                    >
                      <option value=''>Select a bioregion...</option>
                      <option value='tech-haven'>Tech Haven</option>
                      <option value='mythic-forest'>Mythic Forest</option>
                      <option value='isolated-bastion'>Isolated Bastion</option>
                    </select>
                    {errors.bioregionId && (
                      <p className='text-red-600 text-sm mt-1'>
                        {errors.bioregionId.message}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Description *
                    </label>
                    <textarea
                      {...register('description')}
                      rows={3}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      placeholder='Brief description of the ritual...'
                    />
                    {errors.description && (
                      <p className='text-red-600 text-sm mt-1'>
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  {/* Cultural Context */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Cultural Context *
                    </label>
                    <textarea
                      {...register('culturalContext')}
                      rows={4}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                      placeholder='Cultural background and significance...'
                    />
                    {errors.culturalContext && (
                      <p className='text-red-600 text-sm mt-1'>
                        {errors.culturalContext.message}
                      </p>
                    )}
                  </div>

                  {/* Ritual Content */}
                  <div>
                    <label className='block text-sm font-medium text-gray-700 mb-2'>
                      Ritual Content *
                    </label>
                    <textarea
                      {...register('content')}
                      rows={12}
                      className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent font-mono text-sm'
                      placeholder='Enter the ritual content here...'
                    />
                    {errors.content && (
                      <p className='text-red-600 text-sm mt-1'>
                        {errors.content.message}
                      </p>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className='flex flex-wrap gap-4 pt-4'>
                    <button
                      type='submit'
                      disabled={isSubmitting}
                      className='flex items-center px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50'
                    >
                      <Save className='w-4 h-4 mr-2' />
                      {isSubmitting ? 'Creating...' : 'Create .grc File'}
                    </button>

                    <label className='flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer'>
                      <Upload className='w-4 h-4 mr-2' />
                      Load .grc File
                      <input
                        type='file'
                        accept='.grc'
                        onChange={loadFile}
                        className='hidden'
                      />
                    </label>

                    <button
                      type='button'
                      onClick={() => setShowPreview(!showPreview)}
                      className='flex items-center px-6 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700'
                    >
                      {showPreview ? (
                        <EyeOff className='w-4 h-4 mr-2' />
                      ) : (
                        <Eye className='w-4 h-4 mr-2' />
                      )}
                      {showPreview ? 'Hide Preview' : 'Show Preview'}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            {/* Validation Section */}
            <div className='space-y-6'>
              {/* Auto-save Toggle */}
              <div className='bg-white rounded-2xl shadow-xl p-4'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-gray-700'>
                    Auto-save
                  </span>
                  <button
                    onClick={() => setAutoSave(!autoSave)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      autoSave ? 'bg-emerald-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        autoSave ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Validation Results */}
              <div className='bg-white rounded-2xl shadow-xl p-6'>
                <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
                  Validation Results
                </h2>

                {isValidating ? (
                  <div className='text-center py-8'>
                    <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600 mx-auto'></div>
                    <p className='text-gray-600 mt-2'>Validating ritual...</p>
                  </div>
                ) : validationResult ? (
                  <div className='space-y-4'>
                    {/* Overall Status */}
                    <div
                      className={`flex items-center space-x-2 ${getStatusColor(
                        getValidationStatus(),
                      )}`}
                    >
                      {getStatusIcon(getValidationStatus())}
                      <span className='font-semibold'>
                        Status: {getValidationStatus().toUpperCase()}
                      </span>
                    </div>

                    {/* Scores */}
                    <div className='grid grid-cols-2 gap-4'>
                      <div className='bg-gray-50 rounded-lg p-4'>
                        <h3 className='text-sm font-medium text-gray-700'>
                          ESEP Score
                        </h3>
                        <p className='text-2xl font-bold text-emerald-600'>
                          {(validationResult.esepScore * 100).toFixed(1)}%
                        </p>
                        <p className='text-xs text-gray-500'>
                          Ethical-Spiritual Balance
                        </p>
                      </div>
                      <div className='bg-gray-50 rounded-lg p-4'>
                        <h3 className='text-sm font-medium text-gray-700'>
                          CEDA Score
                        </h3>
                        <p className='text-2xl font-bold text-blue-600'>
                          {validationResult.cedaScore}
                        </p>
                        <p className='text-xs text-gray-500'>
                          Cultural References
                        </p>
                      </div>
                    </div>

                    <div className='bg-gray-50 rounded-lg p-4'>
                      <h3 className='text-sm font-medium text-gray-700'>
                        Narrative Score
                      </h3>
                      <p className='text-2xl font-bold text-purple-600'>
                        {(validationResult.narrativeScore * 100).toFixed(1)}%
                      </p>
                      <p className='text-xs text-gray-500'>
                        Community Harmony & Bias Detection
                      </p>
                    </div>

                    {/* Feedback */}
                    {validationResult.feedback.length > 0 && (
                      <div>
                        <h3 className='text-sm font-medium text-gray-700 mb-2'>
                          Feedback
                        </h3>
                        <ul className='space-y-1'>
                          {validationResult.feedback.map((feedback, index) => (
                            <li
                              key={index}
                              className='text-sm text-gray-600 flex items-start'
                            >
                              <span className='text-emerald-500 mr-2'>•</span>
                              {feedback}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className='text-center py-8 text-gray-500'>
                    <FileText className='w-12 h-12 mx-auto mb-4 opacity-50' />
                    <p>Start writing your ritual to see validation results</p>
                  </div>
                )}
              </div>

              {/* Preview */}
              {showPreview && (
                <div className='bg-white rounded-2xl shadow-xl p-6'>
                  <h2 className='text-2xl font-semibold text-gray-900 mb-4'>
                    Preview
                  </h2>
                  <div className='bg-gray-50 rounded-lg p-4 max-h-96 overflow-y-auto'>
                    <pre className='text-sm text-gray-800 whitespace-pre-wrap'>
                      {generateGRCContent(watch())}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
