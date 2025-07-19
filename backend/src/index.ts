import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { config } from 'dotenv';

// Import routes
import { ritualRoutes } from './routes/ritualRoutes';
import { bioregionRoutes } from './routes/bioregionRoutes';
import { daoRoutes } from './routes/daoRoutes';

// Import services
import { DatabaseService } from './services/DatabaseService';
import { IPFSService } from './services/IPFSService';
import { BlockchainService } from './services/BlockchainService';

// Load environment variables
config();

const fastify = Fastify({
  logger: {
    level: process.env.LOG_LEVEL || 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
      },
    },
  },
});

// Register plugins
async function registerPlugins() {
  await fastify.register(cors, {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  await fastify.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https:'],
      },
    },
  });

  await fastify.register(rateLimit, {
    max: 100,
    timeWindow: '1 minute',
  });

  // Swagger documentation
  await fastify.register(swagger, {
    swagger: {
      info: {
        title: 'Global Regeneration Ceremony API',
        description: 'API for bioregional ritual submission and validation',
        version: '1.0.0',
      },
      host: process.env.API_HOST || 'localhost:3001',
      schemes: ['http', 'https'],
      consumes: ['application/json'],
      produces: ['application/json'],
    },
  });

  await fastify.register(swaggerUi, {
    routePrefix: '/docs',
  });
}

// Register routes
async function registerRoutes() {
  await fastify.register(ritualRoutes, { prefix: '/api/v1/rituals' });
  await fastify.register(bioregionRoutes, { prefix: '/api/v1/bioregions' });
  await fastify.register(daoRoutes, { prefix: '/api/v1/dao' });
}

// Initialize services
async function initializeServices() {
  // Initialize database connection
  const dbService = new DatabaseService();
  await dbService.connect();
  fastify.decorate('db', dbService);

  // Initialize IPFS service
  const ipfsService = new IPFSService();
  fastify.decorate('ipfs', ipfsService);

  // Initialize blockchain service
  const blockchainService = new BlockchainService();
  fastify.decorate('blockchain', blockchainService);
}

// Health check endpoint
fastify.get('/health', async (request, reply) => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
  };
});

// Graceful shutdown
process.on('SIGINT', async () => {
  fastify.log.info('Shutting down gracefully...');
  await fastify.close();
  process.exit(0);
});

// Start server
async function start() {
  try {
    await registerPlugins();
    await registerRoutes();
    await initializeServices();

    const port = parseInt(process.env.PORT || '3001');
    const host = process.env.HOST || '0.0.0.0';

    await fastify.listen({ port, host });
    fastify.log.info(`Server listening on ${host}:${port}`);
    fastify.log.info(
      `API documentation available at http://${host}:${port}/docs`,
    );
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
}

start();
