export interface JwtUser {
  sub: string;
  email: string;
  name: string;
  role: 'admin' | 'user' | 'readonly';
  type: 'access';
  iat: number;
  exp: number;
}

declare module 'fastify' {
  interface FastifyRequest {
    user?: JwtUser;
  }
}
