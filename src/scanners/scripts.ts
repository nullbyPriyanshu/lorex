import fs from 'fs';
import path from 'path';

export interface ScriptEntry {
  name: string;
  command: string;
}

export function scanScripts(): ScriptEntry[] {
  const packagePath = path.join(process.cwd(), 'package.json');
  if (!fs.existsSync(packagePath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(packagePath, 'utf-8');
    const pkg = JSON.parse(content);
    const scripts = pkg.scripts || {};
    const importantScripts = ['dev', 'build', 'start', 'test', 'lint'];

    return importantScripts
      .filter((name) => typeof scripts[name] === 'string')
      .map((name) => ({ name, command: scripts[name] }));
  } catch {
    return [];
  }
}
