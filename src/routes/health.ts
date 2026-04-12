import { FastifyInstance } from "fastify";

export function healthCheck(fastify: FastifyInstance) {
  fastify.get('/health', async (req, res) => {
    res.status(200);
    return { status: 'ok' };
  });
}