import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ESEPFilter } from '../filters/ESEPFilter';
import { CEDAFilter } from '../filters/CEDAFilter';
import { NarrativeForensics } from '../filters/NarrativeForensics';
import { DatabaseService } from '../services/DatabaseService';
import { IPFSService } from '../services/IPFSService';
import { BlockchainService } from '../services/BlockchainService';

// Validation schemas
const ritualSubmissionSchema = z.object({
  name: z.string().min(1, 'Ritual name is required').max(100, 'Name too long'),
  bioregionId: z.enum(['tech-haven', 'mythic-forest', 'isolated-bastion'], {
    errorMap: () => ({ message: 'Invalid bioregion selection' }),
  }),
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
    .min(100, 'Ritual content must be at least 100 characters')
    .max(10000, 'Content too long'),
  author: z
    .string()
    .min(1, 'Author name is required')
    .max(100, 'Author name too long'),
  culturalReferences: z.array(z.string()).optional(),
  permissions: z
    .object({
      culturalConsultation: z.boolean().default(false),
      communityApproval: z.boolean().default(false),
      expertReview: z.boolean().default(false),
    })
    .optional(),
});

const ritualFileSchema = z.object({
  file: z.object({
    filename: z.string().endsWith('.grc', 'File must be a .grc file'),
    mimetype: z.string().includes('text/', 'File must be a text file'),
    data: z.instanceof(Buffer),
  }),
});

type RitualSubmissionRequest = z.infer<typeof ritualSubmissionSchema>;
type RitualFileRequest = z.infer<typeof ritualFileSchema>;

interface ValidationResult {
  esepScore: number;
  cedaScore: number;
  narrativeScore: number;
  isApproved: boolean;
  feedback: string[];
  culturalReferences: string[];
  validationTimestamp: string;
}

interface RitualSubmissionResponse {
  success: boolean;
  ritualId: string;
  ipfsHash: string;
  transactionHash?: string | undefined;
  validation: ValidationResult;
  message: string;
}

export default async function submitRitualRoutes(fastify: FastifyInstance) {
  const esepFilter = new ESEPFilter();
  const cedaFilter = new CEDAFilter();
  const narrativeForensics = new NarrativeForensics();
  const dbService = new DatabaseService();
  const ipfsService = new IPFSService();
  const blockchainService = new BlockchainService();

  // POST /api/v1/rituals/submit - Submit ritual via JSON
  fastify.post<{ Body: RitualSubmissionRequest }>(
    '/submit',
    {
      schema: {
        description: 'Submit a ritual for validation and storage',
        tags: ['rituals'],
        body: {
          type: 'object',
          required: [
            'name',
            'bioregionId',
            'description',
            'culturalContext',
            'content',
            'author',
          ],
          properties: {
            name: { type: 'string', minLength: 1, maxLength: 100 },
            bioregionId: {
              type: 'string',
              enum: ['tech-haven', 'mythic-forest', 'isolated-bastion'],
            },
            description: { type: 'string', minLength: 10, maxLength: 500 },
            culturalContext: { type: 'string', minLength: 20, maxLength: 1000 },
            content: { type: 'string', minLength: 100, maxLength: 10000 },
            author: { type: 'string', minLength: 1, maxLength: 100 },
            culturalReferences: {
              type: 'array',
              items: { type: 'string' },
              default: [],
            },
            permissions: {
              type: 'object',
              properties: {
                culturalConsultation: { type: 'boolean', default: false },
                communityApproval: { type: 'boolean', default: false },
                expertReview: { type: 'boolean', default: false },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              ritualId: { type: 'string' },
              ipfsHash: { type: 'string' },
              transactionHash: { type: 'string' },
              validation: {
                type: 'object',
                properties: {
                  esepScore: { type: 'number' },
                  cedaScore: { type: 'number' },
                  narrativeScore: { type: 'number' },
                  isApproved: { type: 'boolean' },
                  feedback: { type: 'array', items: { type: 'string' } },
                  culturalReferences: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  validationTimestamp: { type: 'string' },
                },
              },
              message: { type: 'string' },
            },
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              details: { type: 'array', items: { type: 'string' } },
            },
          },
          422: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              validation: {
                type: 'object',
                properties: {
                  esepScore: { type: 'number' },
                  cedaScore: { type: 'number' },
                  narrativeScore: { type: 'number' },
                  feedback: { type: 'array', items: { type: 'string' } },
                },
              },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RitualSubmissionRequest }>,
      reply: FastifyReply,
    ): Promise<RitualSubmissionResponse> => {
      try {
        // Validate request body
        const validatedData = ritualSubmissionSchema.parse(request.body);

        // Log submission attempt
        fastify.log.info('Ritual submission attempt', {
          bioregionId: validatedData.bioregionId,
          author: validatedData.author,
          contentLength: validatedData.content.length,
        });

        // Run AI validation filters
        const [esepResult, cedaResult, narrativeResult] = await Promise.all([
          esepFilter.validate(validatedData.content),
          cedaFilter.validate(validatedData.content),
          narrativeForensics.analyzeNarrative(validatedData.content),
        ]);

        // Combine validation results
        const validation: ValidationResult = {
          esepScore: esepResult.score,
          cedaScore: cedaResult.culturalReferences.length,
          narrativeScore: narrativeResult.overallScore,
          isApproved:
            esepResult.score <= 0.7 &&
            cedaResult.culturalReferences.length >= 2 &&
            narrativeResult.overallScore >= 0.6,
          feedback: [
            ...esepResult.feedback,
            ...cedaResult.feedback,
            ...narrativeResult.feedback,
          ],
          culturalReferences: cedaResult.culturalReferences.map(
            (ref) => ref.content,
          ),
          validationTimestamp: new Date().toISOString(),
        };

        // Check if ritual meets approval criteria
        if (!validation.isApproved) {
          fastify.log.warn('Ritual validation failed', {
            esepScore: validation.esepScore,
            cedaScore: validation.cedaScore,
            narrativeScore: validation.narrativeScore,
          });

          return reply.status(422).send({
            success: false,
            error: 'Ritual validation failed',
            validation: {
              esepScore: validation.esepScore,
              cedaScore: validation.cedaScore,
              narrativeScore: validation.narrativeScore,
              feedback: validation.feedback,
            },
          });
        }

        // Create ritual metadata
        const ritualMetadata = {
          name: validatedData.name,
          bioregionId: validatedData.bioregionId,
          description: validatedData.description,
          culturalContext: validatedData.culturalContext,
          content: validatedData.content,
          author: validatedData.author,
          culturalReferences: validatedData.culturalReferences || [],
          permissions: validatedData.permissions || {},
          validation,
          submittedAt: new Date().toISOString(),
          version: '1.0',
        };

        // Store metadata on IPFS
        const ipfsHash = await ipfsService.storeMetadata(ritualMetadata);
        fastify.log.info('Ritual metadata stored on IPFS', { ipfsHash });

        // Log transaction on blockchain
        let transactionHash: string | undefined;
        try {
          transactionHash = await blockchainService.logRitualSubmission({
            ipfsHash,
            bioregionId: validatedData.bioregionId,
            author: validatedData.author,
            esepScore: validation.esepScore,
            cedaScore: validation.cedaScore,
            narrativeScore: validation.narrativeScore,
            isApproved: validation.isApproved,
          });
          fastify.log.info('Ritual logged on blockchain', { transactionHash });
        } catch (blockchainError) {
          fastify.log.error('Blockchain logging failed', {
            error: blockchainError,
          });
          // Continue without blockchain logging - IPFS storage is sufficient
        }

        // Store in database
        const ritualId = await dbService.createRitual({
          ...ritualMetadata,
          ipfsHash,
          transactionHash,
          status: 'approved',
        });

        fastify.log.info('Ritual submission successful', {
          ritualId,
          ipfsHash,
          transactionHash,
        });

        return {
          success: true,
          ritualId,
          ipfsHash,
          transactionHash,
          validation,
          message: 'Ritual submitted successfully and approved',
        };
      } catch (error) {
        fastify.log.error('Ritual submission error', { error });

        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'Validation error',
            details: error.errors.map(
              (e) => `${e.path.join('.')}: ${e.message}`,
            ),
          });
        }

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          details: ['An unexpected error occurred while processing the ritual'],
        });
      }
    },
  );

  // POST /api/v1/rituals/submit/file - Submit ritual via .grc file upload
  fastify.post<{ Body: RitualFileRequest }>(
    '/submit/file',
    {
      schema: {
        description: 'Submit a ritual via .grc file upload',
        tags: ['rituals'],
        consumes: ['multipart/form-data'],
        body: {
          type: 'object',
          properties: {
            file: {
              type: 'object',
              properties: {
                filename: { type: 'string' },
                mimetype: { type: 'string' },
                data: { type: 'string', format: 'binary' },
              },
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              ritualId: { type: 'string' },
              ipfsHash: { type: 'string' },
              transactionHash: { type: 'string' },
              validation: {
                type: 'object',
                properties: {
                  esepScore: { type: 'number' },
                  cedaScore: { type: 'number' },
                  narrativeScore: { type: 'number' },
                  isApproved: { type: 'boolean' },
                  feedback: { type: 'array', items: { type: 'string' } },
                  culturalReferences: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  validationTimestamp: { type: 'string' },
                },
              },
              message: { type: 'string' },
            },
          },
        },
      },
    },
    async (
      request: FastifyRequest<{ Body: RitualFileRequest }>,
      reply: FastifyReply,
    ): Promise<RitualSubmissionResponse> => {
      try {
        // Parse uploaded file
        const data = await request.file();
        if (!data) {
          return reply.status(400).send({
            success: false,
            error: 'No file uploaded',
            details: ['Please upload a .grc file'],
          });
        }

        // Validate file
        const validatedFile = ritualFileSchema.parse({ file: data });

        // Parse .grc file content
        const fileContent = validatedFile.file.data.toString('utf-8');
        const parsedRitual = parseGRCFile(fileContent);

        // Process as regular ritual submission
        const submissionRequest: RitualSubmissionRequest = {
          ...parsedRitual,
          culturalReferences: parsedRitual.culturalReferences || [],
        };

        // Reuse the main submission logic
        return await fastify.inject({
          method: 'POST',
          url: '/api/v1/rituals/submit',
          payload: submissionRequest,
        });
      } catch (error) {
        fastify.log.error('File upload error', { error });

        if (error instanceof z.ZodError) {
          return reply.status(400).send({
            success: false,
            error: 'File validation error',
            details: error.errors.map(
              (e) => `${e.path.join('.')}: ${e.message}`,
            ),
          });
        }

        return reply.status(500).send({
          success: false,
          error: 'Internal server error',
          details: ['An unexpected error occurred while processing the file'],
        });
      }
    },
  );

  // POST /api/v1/rituals/validate - Validate ritual without submission
  fastify.post(
    '/validate',
    {
      schema: {
        description: 'Validate a ritual without submitting it',
        tags: ['rituals'],
        body: {
          type: 'object',
          required: ['content', 'bioregionId'],
          properties: {
            content: { type: 'string', minLength: 100 },
            bioregionId: {
              type: 'string',
              enum: ['tech-haven', 'mythic-forest', 'isolated-bastion'],
            },
          },
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              validation: {
                type: 'object',
                properties: {
                  esepScore: { type: 'number' },
                  cedaScore: { type: 'number' },
                  narrativeScore: { type: 'number' },
                  isApproved: { type: 'boolean' },
                  feedback: { type: 'array', items: { type: 'string' } },
                  culturalReferences: {
                    type: 'array',
                    items: { type: 'string' },
                  },
                  validationTimestamp: { type: 'string' },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { content, bioregionId } = request.body as {
          content: string;
          bioregionId: string;
        };

        // Run AI validation filters
        const [esepResult, cedaResult, narrativeResult] = await Promise.all([
          esepFilter.evaluateRitual(content),
          cedaFilter.analyzeCulturalExpression(content),
          narrativeForensics.analyzeNarrative(content),
        ]);

        const validation: ValidationResult = {
          esepScore: esepResult.score,
          cedaScore: cedaResult.culturalReferences.length,
          narrativeScore: narrativeResult.overallScore,
          isApproved:
            esepResult.score <= 0.7 &&
            cedaResult.culturalReferences.length >= 2 &&
            narrativeResult.overallScore >= 0.6,
          feedback: [
            ...esepResult.feedback,
            ...cedaResult.feedback,
            ...narrativeResult.feedback,
          ],
          culturalReferences: cedaResult.culturalReferences,
          validationTimestamp: new Date().toISOString(),
        };

        return {
          success: true,
          validation,
        };
      } catch (error) {
        fastify.log.error('Validation error', { error });
        return reply.status(500).send({
          success: false,
          error: 'Validation failed',
          details: ['An error occurred during validation'],
        });
      }
    },
  );
}

// Helper function to parse .grc file content
function parseGRCFile(content: string): Partial<RitualSubmissionRequest> {
  const lines = content.split('\n');
  const result: Partial<RitualSubmissionRequest> = {};

  let currentSection = '';
  let contentLines: string[] = [];

  for (const line of lines) {
    if (line.startsWith('# ')) {
      if (line.includes('Bioregion:')) {
        const bioregionName = line.split('Bioregion:')[1]?.trim();
        result.bioregionId = getBioregionId(bioregionName);
      } else if (!line.includes('Created:') && !line.includes('Bioregion:')) {
        result.name = line.replace('# ', '').trim();
      }
    } else if (line.startsWith('## Description')) {
      currentSection = 'description';
    } else if (line.startsWith('## Cultural Context')) {
      currentSection = 'culturalContext';
    } else if (line.startsWith('## Ritual Content')) {
      currentSection = 'content';
    } else if (line.startsWith('## ') && currentSection === 'content') {
      currentSection = '';
    } else if (line.trim() && currentSection) {
      if (currentSection === 'content') {
        contentLines.push(line);
      } else {
        result[currentSection as keyof RitualSubmissionRequest] = line.trim();
      }
    }
  }

  if (contentLines.length > 0) {
    result.content = contentLines.join('\n');
  }

  return result;
}

// Helper function to map bioregion names to IDs
function getBioregionId(name: string): string {
  const mapping: Record<string, string> = {
    'Tech Haven': 'tech-haven',
    'Mythic Forest': 'mythic-forest',
    'Isolated Bastion': 'isolated-bastion',
  };
  return mapping[name] || '';
}
