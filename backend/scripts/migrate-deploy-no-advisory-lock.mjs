/**
 * Use only when `prisma migrate deploy` fails with P1002 (advisory lock timeout)
 * on Neon/pooler or a stuck session — and nothing else is running a migration.
 * Prefer: stop backend dev / Prisma Studio, set DIRECT_URL, then normal migrate deploy.
 */
import { execSync } from 'node:child_process';

process.env.PRISMA_SCHEMA_DISABLE_ADVISORY_LOCK = '1';
execSync('npx prisma migrate deploy', { stdio: 'inherit', env: process.env });
