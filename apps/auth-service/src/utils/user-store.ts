/**
 * In-memory user store — Day 4 only.
 * Replaced by Postgres/Prisma on Day 6.
 * Keeps Day 4 self-contained with zero external dependencies.
 */
export interface StoredUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: 'admin' | 'user' | 'readonly';
  createdAt: Date;
  updatedAt: Date;
}

// Simple Map — survives the process lifetime only
const users = new Map<string, StoredUser>();
const emailIndex = new Map<string, string>(); // email → id

export const userStore = {
  create(data: Omit<StoredUser, 'id' | 'createdAt' | 'updatedAt'>): StoredUser {
    const user: StoredUser = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.set(user.id, user);
    emailIndex.set(user.email.toLowerCase(), user.id);
    return user;
  },

  findById(id: string): StoredUser | undefined {
    return users.get(id);
  },

  findByEmail(email: string): StoredUser | undefined {
    const id = emailIndex.get(email.toLowerCase());
    return id ? users.get(id) : undefined;
  },

  exists(email: string): boolean {
    return emailIndex.has(email.toLowerCase());
  },
};