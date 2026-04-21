/**
 * Categorize packages by their purpose/category
 */

export interface GroupedDependencies {
  ui: Record<string, string>;
  database: Record<string, string>;
  auth: Record<string, string>;
  stateManagement: Record<string, string>;
  testing: Record<string, string>;
  tooling: Record<string, string>;
  other: Record<string, string>;
}

const CATEGORY_MAP: Record<string, Record<string, string>> = {
  ui: {
    react: 'React',
    vue: 'Vue',
    svelte: 'Svelte',
    '@angular/core': 'Angular',
    'next': 'Next.js',
    'nuxt': 'Nuxt',
    '@chakra-ui/react': 'Chakra UI',
    '@mui/material': 'Material UI',
    'shadcn-ui': 'shadcn/ui',
    'tailwindcss': 'Tailwind CSS',
    '@headlessui/react': 'Headless UI',
    'framer-motion': 'Framer Motion',
    '@react-spring/web': 'React Spring',
    'react-beautiful-dnd': 'React Beautiful DnD',
    '@dnd-kit/core': 'dnd kit',
  },
  database: {
    '@prisma/client': 'Prisma',
    'mongoose': 'Mongoose',
    'typeorm': 'TypeORM',
    'sequelize': 'Sequelize',
    'drizzle-orm': 'Drizzle ORM',
    'mikro-orm': 'MikroORM',
    'knex': 'Knex',
    'pg': 'PostgreSQL Driver',
    'mysql2': 'MySQL Driver',
    'mongodb': 'MongoDB Driver',
    '@supabase/supabase-js': 'Supabase',
    'firebase': 'Firebase',
    '@fauna/fauna': 'Fauna',
    'redis': 'Redis',
    'ioredis': 'IORedis',
  },
  auth: {
    'next-auth': 'NextAuth.js',
    'nextauth': 'NextAuth.js',
    '@next-auth/prisma-adapter': 'NextAuth Prisma',
    '@clerk/nextjs': 'Clerk',
    '@clerk/clerk-react': 'Clerk',
    'clerk': 'Clerk',
    'passport': 'Passport.js',
    'passport-jwt': 'Passport JWT',
    'jsonwebtoken': 'JWT',
    'jsonwebtoken': 'JWT',
    'bcryptjs': 'bcryptjs',
    'bcrypt': 'bcrypt',
    '@auth/core': 'Auth.js',
    'supertokens-node': 'SuperTokens',
    'kratos': 'Ory Kratos',
  },
  stateManagement: {
    'redux': 'Redux',
    '@reduxjs/toolkit': 'Redux Toolkit',
    'zustand': 'Zustand',
    'jotai': 'Jotai',
    'recoil': 'Recoil',
    'mobx': 'Mobx',
    'valtio': 'Valtio',
    'xstate': 'XState',
    '@tanstack/react-query': 'TanStack Query',
    'react-query': 'React Query',
    '@apollo/client': 'Apollo Client',
    'graphql-request': 'GraphQL Request',
    'swr': 'SWR',
  },
  testing: {
    'jest': 'Jest',
    'vitest': 'Vitest',
    'mocha': 'Mocha',
    'chai': 'Chai',
    '@testing-library/react': 'React Testing Library',
    '@testing-library/jest-dom': 'Testing Library DOM',
    'cypress': 'Cypress',
    'playwright': 'Playwright',
    '@playwright/test': 'Playwright Test',
    'puppeteer': 'Puppeteer',
    'supertest': 'Supertest',
    'sinon': 'Sinon',
    '@vitest/ui': 'Vitest UI',
  },
  tooling: {
    'typescript': 'TypeScript',
    'eslint': 'ESLint',
    'prettier': 'Prettier',
    'vite': 'Vite',
    'webpack': 'Webpack',
    'tsup': 'tsup',
    'esbuild': 'esbuild',
    'rollup': 'Rollup',
    'turbo': 'Turborepo',
    'nx': 'Nx',
    'husky': 'Husky',
    'lint-staged': 'lint-staged',
    'commitlint': 'commitlint',
    'concurrently': 'concurrently',
    'nodemon': 'Nodemon',
    'ts-node': 'ts-node',
    '@babel/core': 'Babel',
    'dotenv': 'dotenv',
  },
};

/**
 * Group dependencies by category
 */
export function groupDependencies(
  dependencies: Record<string, string>,
  devDependencies: Record<string, string>
): GroupedDependencies {
  const allDeps = { ...dependencies, ...devDependencies };

  const grouped: GroupedDependencies = {
    ui: {},
    database: {},
    auth: {},
    stateManagement: {},
    testing: {},
    tooling: {},
    other: {},
  };

  for (const [pkg, version] of Object.entries(allDeps)) {
    let categorized = false;

    for (const [category, packages] of Object.entries(CATEGORY_MAP)) {
      if (packages[pkg]) {
        grouped[category as keyof GroupedDependencies][packages[pkg]] = version;
        categorized = true;
        break;
      }
    }

    if (!categorized) {
      // Skip @types packages
      if (!pkg.startsWith('@types/')) {
        grouped.other[pkg] = version;
      }
    }
  }

  return grouped;
}
