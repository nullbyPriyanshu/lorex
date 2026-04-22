import fs from 'fs';
import path from 'path';

export interface AuthConfig {
  authType?: string; // NextAuth, Clerk, Custom, None
  providers?: string[];
  sessionStrategy?: string; // JWT or Database
  configFiles: string[];
}

/**
 * Scan for NextAuth.js configuration
 */
function scanNextAuth(cwd: string, allDeps: Record<string, string>): AuthConfig | null {
  const hasNextAuth =
    allDeps['next-auth'] || allDeps['nextauth'] || allDeps['@next-auth/prisma-adapter'];

  if (!hasNextAuth) return null;

  const config: AuthConfig = {
    authType: 'NextAuth.js',
    providers: [],
    configFiles: [],
  };

  // Check for NextAuth config files
  const possiblePaths = [
    path.join(cwd, 'app', 'api', 'auth', '[...nextauth]', 'route.ts'),
    path.join(cwd, 'app', 'api', 'auth', '[...nextauth]', 'route.js'),
    path.join(cwd, 'pages', 'api', 'auth', '[...nextauth].ts'),
    path.join(cwd, 'pages', 'api', 'auth', '[...nextauth].js'),
  ];

  let configContent = '';

  for (const filePath of possiblePaths) {
    if (fs.existsSync(filePath)) {
      config.configFiles.push(path.relative(cwd, filePath));
      try {
        configContent = fs.readFileSync(filePath, 'utf-8');
        break;
      } catch {
        continue;
      }
    }
  }

  // Extract providers from config
  if (configContent) {
    const providers = [
      'CredentialsProvider',
      'GitHubProvider',
      'GoogleProvider',
      'FacebookProvider',
      'TwitterProvider',
      'LinkedInProvider',
      'GitLabProvider',
      'DiscordProvider',
      'OktaProvider',
      'Auth0Provider',
      'AzureADProvider',
      'KeycloakProvider',
      'TwitchProvider',
      'MailchimpProvider',
    ];

    for (const provider of providers) {
      if (new RegExp(provider).test(configContent)) {
        const label = provider
          .replace('Provider', '')
          .replace(/([A-Z])/g, ' $1')
          .trim();
        config.providers.push(label);
      }
    }

    // Detect session strategy
    if (
      configContent.includes('jwt') ||
      configContent.includes('session: { strategy: "jwt"')
    ) {
      config.sessionStrategy = 'JWT';
    } else if (
      configContent.includes('database') ||
      allDeps['@next-auth/prisma-adapter']
    ) {
      config.sessionStrategy = 'Database';
    }
  }

  return config;
}

/**
 * Scan for Clerk configuration
 */
function scanClerk(cwd: string, allDeps: Record<string, string>): AuthConfig | null {
  const hasClerk =
    allDeps['@clerk/nextjs'] ||
    allDeps['@clerk/clerk-react'] ||
    allDeps['clerk'];

  if (!hasClerk) return null;

  const config: AuthConfig = {
    authType: 'Clerk',
    providers: [],
    configFiles: [],
  };

  // Check for clerk config
  const possibleConfigFiles = [
    path.join(cwd, '.env.local'),
    path.join(cwd, '.env'),
    path.join(cwd, '.env.example'),
  ];

  for (const filePath of possibleConfigFiles) {
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        if (content.includes('CLERK_')) {
          config.configFiles.push(path.relative(cwd, filePath));
          break;
        }
      } catch {
        continue;
      }
    }
  }

  // Clerk typically uses OAuth providers via their dashboard
  config.providers = ['OAuth (via Clerk Dashboard)'];
  config.sessionStrategy = 'JWT (Clerk)';

  return config;
}

/**
 * Scan project for authentication setup
 */
export function scanAuth(cwd: string): AuthConfig {
  try {
    // Load package.json to check dependencies
    const packageJsonPath = path.join(cwd, 'package.json');
    let allDeps: Record<string, string> = {};

    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {}),
      };
    }

    // Check for NextAuth
    const nextAuthConfig = scanNextAuth(cwd, allDeps);
    if (nextAuthConfig) return nextAuthConfig;

    // Check for Clerk
    const clerkConfig = scanClerk(cwd, allDeps);
    if (clerkConfig) return clerkConfig;

    // Check for other auth libraries
    if (allDeps['better-auth']) {
      return {
        authType: 'Better Auth',
        providers: [],
        configFiles: [],
      };
    }

    if (allDeps['lucia']) {
      return {
        authType: 'Lucia',
        providers: [],
        configFiles: [],
      };
    }

    if (allDeps['iron-session']) {
      return {
        authType: 'Iron Session',
        providers: [],
        configFiles: [],
      };
    }

    if (allDeps['jose']) {
      return {
        authType: 'Jose (JWT)',
        providers: [],
        configFiles: [],
      };
    }

    if (allDeps['passport'] || allDeps['passport-jwt']) {
      return {
        authType: 'Passport.js',
        providers: [],
        configFiles: [],
      };
    }

    if (allDeps['jsonwebtoken']) {
      return {
        authType: 'Custom (JWT)',
        providers: [],
        configFiles: [],
      };
    }

    // Check for custom auth implementation
    const apiAuthPath = path.join(cwd, 'app', 'api', 'auth');
    if (fs.existsSync(apiAuthPath)) {
      return {
        authType: 'Custom Auth implementation',
        providers: [],
        configFiles: [],
      };
    }

    // No auth detected
    return {
      authType: 'None detected',
      providers: [],
      configFiles: [],
    };
  } catch (error) {
    return {
      authType: 'Error detecting auth',
      providers: [],
      configFiles: [],
    };
  }
}
