import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { loadEnvFile } from 'node:process';
import { PrismaClient, UserRole } from '@prisma/client';
import { hashPassword } from '../src/auth/password-hasher.js';

const rootEnvPath = resolve(process.cwd(), '..', '..', '.env');
if (existsSync(rootEnvPath)) {
  loadEnvFile(rootEnvPath);
}

const prisma = new PrismaClient();

async function seed(): Promise<void> {
  const email = process.env.SEED_ADMIN_EMAIL?.trim().toLowerCase();
  const fullName = process.env.SEED_ADMIN_NAME?.trim() || 'HighStudy Admin';
  const password = process.env.SEED_ADMIN_PASSWORD;
  const instituteName =
    process.env.SEED_INSTITUTE_NAME?.trim() || 'HighStudy Academy';
  const instituteSlug =
    process.env.SEED_INSTITUTE_SLUG?.trim() || 'highstudy-academy';

  if (!email || !password || password.length < 8) {
    throw new Error(
      'Set SEED_ADMIN_EMAIL and a SEED_ADMIN_PASSWORD of at least 8 characters in the root .env file.',
    );
  }

  const institute = await prisma.institute.upsert({
    where: { slug: instituteSlug },
    update: {},
    create: { name: instituteName, slug: instituteSlug },
  });
  const passwordHash = await hashPassword(password);

  await prisma.branch.upsert({
    where: {
      instituteId_name: {
        instituteId: institute.id,
        name: 'Main branch',
      },
    },
    update: {},
    create: {
      instituteId: institute.id,
      name: 'Main branch',
    },
  });

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    const existingMembership = await prisma.membership.findFirst({
      where: {
        userId: existingUser.id,
        instituteId: institute.id,
        role: UserRole.INSTITUTE_ADMIN,
      },
    });

    if (!existingMembership) {
      throw new Error(
        'The bootstrap email already belongs to another account. Choose a new SEED_ADMIN_EMAIL.',
      );
    }

    await prisma.user.update({
      where: { id: existingUser.id },
      data: { fullName, passwordHash },
    });
    console.info('The bootstrap institute administrator credentials were updated.');
    return;
  }

  await prisma.user.create({
    data: {
      email,
      fullName,
      passwordHash,
      memberships: {
        create: {
          instituteId: institute.id,
          role: UserRole.INSTITUTE_ADMIN,
        },
      },
    },
  });

  console.info('The bootstrap institute administrator is ready.');
}

seed()
  .catch((error: unknown) => {
    console.error('HighStudy seed failed.', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
