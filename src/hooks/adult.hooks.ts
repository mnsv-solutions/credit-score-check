// src/hooks/auth.hooks.ts
import type { FastifyReply, FastifyRequest } from 'fastify';

export const validateAdult = async (request: FastifyRequest, reply: FastifyReply) => {
  const { dateOfBirth } = request.body as { dateOfBirth: string };
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) {
    age--;
  }

  if (age < 18) {
    return reply.status(400).send({
      statusCode: 400,
      error: 'Bad Request',
      message: 'Applicant must be at least 18 years old.',
    });
  }
};