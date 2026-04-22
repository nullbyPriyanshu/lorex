import { execSync } from 'child_process';

export interface Commit {
  hash: string;
  message: string;
  daysAgo: number;
}

/**
 * Calculate days ago from a date string
 */
function calculateDaysAgo(dateString: string): number {
  try {
    const commitDate = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - commitDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  } catch {
    return 0;
  }
}

/**
 * Format days as human-readable string
 */
export function formatDaysAgo(days: number): string {
  if (days === 0) return 'today';
  if (days === 1) return '1 day ago';
  if (days < 7) return `${days} days ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return months === 1 ? '1 month ago' : `${months} months ago`;
  }
  const years = Math.floor(days / 365);
  return years === 1 ? '1 year ago' : `${years} years ago`;
}

/**
 * Get the last N commits in a formatted structure
 * Returns empty array if no git repository is found
 */
export function scanGitCommits(count: number = 5): Commit[] {
  try {
    // Check if git is initialized first
    execSync('git rev-parse --git-dir', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 3000,
      stdio: 'pipe',
    });

    // Get commits using a safer format
    const output = execSync(`git log --format=%H§%s§%ai --max-count=${count}`, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 3000,
    });

    const commits = output
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [hash, message, dateTime] = line.split('§');
        let daysAgo = 0;

        try {
          if (dateTime) {
            // dateTime is in format: 2024-01-15 14:32:45 +0000
            const dateOnly = dateTime.split(' ')[0]; // Extract YYYY-MM-DD
            daysAgo = calculateDaysAgo(dateOnly);
          }
        } catch {
          // Keep daysAgo as 0 on error
        }

        return {
          hash: hash ? hash.substring(0, 7) : '',
          message: message || '',
          daysAgo: daysAgo,
        };
      });

    return commits;
  } catch (error) {
    // Git repository not found or command failed
    return [];
  }
}

/**
 * Legacy function for backward compatibility
 */
export function scanGit(): string[] {
  try {
    // Check if git is initialized first
    execSync('git rev-parse --git-dir', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 3000,
      stdio: 'pipe',
    });

    const output = execSync('git log --oneline -10', {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 3000,
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}
