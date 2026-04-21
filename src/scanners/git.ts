import { execSync } from 'child_process';

export interface Commit {
  hash: string;
  message: string;
  date: string;
}

/**
 * Get the last N commits in a formatted structure
 */
export function scanGitCommits(count: number = 5): Commit[] {
  try {
    const output = execSync(`git log --format=%H§%s§%ai -${count}`, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      timeout: 3000,
    });

    return output
      .split('\n')
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const [hash, message, date] = line.split('§');
        // Extract just the date part (YYYY-MM-DD)
        const dateOnly = date ? date.split(' ')[0] : '';
        return {
          hash: hash ? hash.substring(0, 7) : '',
          message: message || '',
          date: dateOnly,
        };
      });
  } catch {
    return [];
  }
}

/**
 * Legacy function for backward compatibility
 */
export function scanGit(): string[] {
  try {
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
