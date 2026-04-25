import { z } from 'zod';

export const CreateUserSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email')
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  name: z.string().min(1).max(100).trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and a number',
    ),
  role: z.enum(['ADMIN', 'USER', 'READONLY']).default('USER'),
});

export const UpdateUserSchema = z.object({
  name:     z.string().min(1).max(100).trim().optional(),
  role:     z.enum(['ADMIN', 'USER', 'READONLY']).optional(),
  isActive: z.boolean().optional(),
});

export const ListUsersSchema = z.object({
  page:     z.coerce.number().int().positive().default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
  role:     z.enum(['ADMIN', 'USER', 'READONLY']).optional(),
  isActive: z.coerce.boolean().optional(),
  search:   z.string().max(100).optional(),
  sortBy:   z.enum(['createdAt', 'name', 'email']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const UserIdSchema = z.object({
  id: z.string().uuid('User ID must be a valid UUID'),
});

export type CreateUserInput = z.infer<typeof CreateUserSchema>;
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;
export type ListUsersQuery  = z.infer<typeof ListUsersSchema>;