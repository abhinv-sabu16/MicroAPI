import { z } from 'zod';

// ── Request schemas ────────────────────────────────────────────────────────

export const RegisterSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .max(255)
    .transform((v) => v.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must be under 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be under 100 characters')
    .trim(),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .email('Must be a valid email address')
    .transform((v) => v.toLowerCase().trim()),
  password: z.string().min(1, 'Password is required'),
});

export const RefreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const LogoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

// ── Response types ─────────────────────────────────────────────────────────

export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type RefreshInput = z.infer<typeof RefreshSchema>;
export type LogoutInput = z.infer<typeof LogoutSchema>;