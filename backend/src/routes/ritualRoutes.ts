import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { ESEPFilter } from '../filters/ESEPFilter';
import { CEDAFilter } from '../filters/CEDAFilter';
import { RitualService } from '../services/RitualService';

// Request/Response schemas
const submitRitualSchema = {
  schema: {
    description: 'Submit a regeneration ritual for validation',
    tags: ['rituals'],
    consumes: ['multipart/form-data'],
    body: {
      type: 'object',
      properties: {
        ritualFile: {
          type: 'string',
          format: 'binary',
          description: 'Ritual file (.grc format)',
        },
        bioregionId: {
          type: 'string',
          description: 'Bioregion identifier',
        },
        ritualName: {
          type: 'string',
          description: 'Name of the ritual',
        },
        description: {
          type: 'string',
          description: 'Ritual description',
        },
        culturalContext: {
          type: 'string',
          description: 'Cultural context and background',
        },
      },
      required: ['ritualFile', 'bioregionId', 'ritualName'],
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
              isApproved: { type: 'boolean' },
              feedback: { type: 'array', items: { type: 'string' } },
            },
          },
        },
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' },
          details: { type: 'string' },
        },
      },
    },
  },
};

const getRitualSchema = {
  schema: {
    description: 'Get ritual details by ID',
    tags: ['rituals'],
    params: {
      type: 'object',
      properties: {
        id: { type: 'string' },
      },
      required: ['id'],
    },
    response: {
      200: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          bioregionId: { type: 'string' },
          ipfsHash: { type: 'string' },
          transactionHash: { type: 'string' },
          validation: {
            type: 'object',
            properties: {
              esepScore: { type: 'number' },
              cedaScore: { type: 'number' },
              isApproved: { type: 'boolean' },
            },
          },
          createdAt: { type: 'string' },
        },
      },
    },
  },
};

export async function ritualRoutes(fastify: FastifyInstance) {
  const ritualService = new RitualService();
  const esepFilter = new ESEPFilter();
  const cedaFilter = new CEDAFilter();

  // Submit ritual endpoint
  fastify.post(
    '/submit',
    submitRitualSchema,
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const data = await request.file();

        if (!data) {
          return reply.status(400).send({
            error: 'No ritual file provided',
            details: 'Please upload a .grc ritual file',
          });
        }

        // Validate file type
        if (!data.filename?.endsWith('.grc')) {
          return reply.status(400).send({
            error: 'Invalid file type',
            details: 'Only .grc files are accepted',
          });
        }

        // Parse form data
        const bioregionId = data.fields.bioregionId?.value as string;
        const ritualName = data.fields.ritualName?.value as string;
        const description = data.fields.description?.value as string;
        const culturalContext = data.fields.culturalContext?.value as string;

        // Validate required fields
        if (!bioregionId || !ritualName) {
          return reply.status(400).send({
            error: 'Missing required fields',
            details: 'bioregionId and ritualName are required',
          });
        }

        // Read ritual content
        const ritualContent = await data.toBuffer();
        const ritualText = ritualContent.toString('utf-8');

        // Run AI validation filters
        const esepResult = await esepFilter.validate(ritualText);
        const cedaResult = await cedaFilter.validate(ritualText);

        // Determine approval status
        const isApproved = esepResult.score <= 0.7 && cedaResult.score >= 2;

        // Store ritual metadata on IPFS
        const metadata = {
          name: ritualName,
          bioregionId,
          description,
          culturalContext,
          content: ritualText,
          validation: {
            esepScore: esepResult.score,
            cedaScore: cedaResult.score,
            isApproved,
            feedback: [...esepResult.feedback, ...cedaResult.feedback],
          },
          submittedAt: new Date().toISOString(),
        };

        const ipfsHash = await fastify.ipfs.storeMetadata(metadata);

        // Log transaction on blockchain
        const transactionHash = await fastify.blockchain.logRitualSubmission({
          ritualId: `ritual_${Date.now()}`,
          bioregionId,
          ipfsHash,
          esepScore: esepResult.score,
          cedaScore: cedaResult.score,
          isApproved,
        });

        // Store in database
        const ritualId = await ritualService.createRitual({
          name: ritualName,
          bioregionId,
          ipfsHash,
          transactionHash,
          validation: {
            esepScore: esepResult.score,
            cedaScore: cedaResult.score,
            isApproved,
          },
        });

        return reply.send({
          success: true,
          ritualId,
          ipfsHash,
          transactionHash,
          validation: {
            esepScore: esepResult.score,
            cedaScore: cedaResult.score,
            isApproved,
            feedback: [...esepResult.feedback, ...cedaResult.feedback],
          },
        });
      } catch (error) {
        fastify.log.error('Error submitting ritual:', error);
        return reply.status(500).send({
          error: 'Internal server error',
          details: 'Failed to process ritual submission',
        });
      }
    },
  );

  // Get ritual by ID
  fastify.get(
    '/:id',
    getRitualSchema,
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { id } = request.params as { id: string };
        const ritual = await ritualService.getRitualById(id);

        if (!ritual) {
          return reply.status(404).send({
            error: 'Ritual not found',
            details: `No ritual found with ID: ${id}`,
          });
        }

        return reply.send(ritual);
      } catch (error) {
        fastify.log.error('Error fetching ritual:', error);
        return reply.status(500).send({
          error: 'Internal server error',
          details: 'Failed to fetch ritual',
        });
      }
    },
  );

  // Get all rituals for a bioregion
  fastify.get(
    '/bioregion/:bioregionId',
    {
      schema: {
        description: 'Get all rituals for a specific bioregion',
        tags: ['rituals'],
        params: {
          type: 'object',
          properties: {
            bioregionId: { type: 'string' },
          },
          required: ['bioregionId'],
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        const { bioregionId } = request.params as { bioregionId: string };
        const rituals = await ritualService.getRitualsByBioregion(bioregionId);

        return reply.send({
          bioregionId,
          rituals,
          count: rituals.length,
        });
      } catch (error) {
        fastify.log.error('Error fetching bioregion rituals:', error);
        return reply.status(500).send({
          error: 'Internal server error',
          details: 'Failed to fetch bioregion rituals',
        });
      }
    },
  );
}
