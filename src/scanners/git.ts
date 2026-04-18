import { execSync } from 'child_process';

export function scanGit(): string[] {
  try {
    const output = execSync('git log --oneline -10', {
      cwd: process.cwd(),
      encoding: 'utf-8',
    });

    return output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  } catch {
    return [];
  }
}
