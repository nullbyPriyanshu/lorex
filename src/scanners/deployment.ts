import fs from 'fs';
import path from 'path';

export function scanDeployment(): string | null {
  const root = process.cwd();
  const platforms: string[] = [];

  if (fs.existsSync(path.join(root, 'vercel.json')) || fs.existsSync(path.join(root, '.vercel'))) {
    platforms.push('Vercel');
  }

  if (fs.existsSync(path.join(root, 'render.yaml'))) {
    platforms.push('Render');
  }

  if (fs.existsSync(path.join(root, 'railway.json'))) {
    platforms.push('Railway');
  }

  if (fs.existsSync(path.join(root, 'Dockerfile'))) {
    platforms.push('Docker');
  }

  if (fs.existsSync(path.join(root, '.github', 'workflows'))) {
    platforms.push('GitHub Actions CI/CD');
  }

  if (platforms.length === 0) {
    return null;
  }

  return platforms.join(', ');
}
