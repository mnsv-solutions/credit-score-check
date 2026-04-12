import * as dotenv from 'dotenv';
dotenv.config();

import Fastify from 'fastify';
import { creditCheck } from './routes/credit-check.js';
import { PrismaService } from './database.js';
import { healthCheck } from './routes/health.js';

const fastify = Fastify();

// Initialize Prisma after plugins
let prismaSvc: PrismaService;

// Register plugins
fastify.register(async (fastify) => {
  prismaSvc = new PrismaService();
  await prismaSvc.connect();

  // Register routes after DB connection
  await fastify.register(creditCheck);
  await fastify.register(healthCheck);
});

const port = Number(process.env.PORT) || 3001;
const host = process.env.HOST || 'http://0.0.0.0';

const start = async () => {
  try {
    console.log(`Server running on ${host}:${port}`);
    fastify.listen({ port: port, host: '0.0.0.0' }, (err) => {
      if (err) {
        console.error('Error starting server:', err);
      }
    });
  } catch (error) {
    console.error('Error starting server:', error);
  }
};

start();