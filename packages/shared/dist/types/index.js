"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserRole = exports.PaginationSchema = void 0;
const zod_1 = require("zod");
// ── Pagination query params ────────────────────────────────────────────────
exports.PaginationSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
});
// ── User domain ────────────────────────────────────────────────────────────
exports.UserRole = {
    ADMIN: 'admin',
    USER: 'user',
    READONLY: 'readonly',
};
