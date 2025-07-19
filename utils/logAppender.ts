import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const LOG_FILE = path.resolve(__dirname, '../../ai-sync-log.md');

export function appendToLog(markdownEntry: string) {
  const timestamp = new Date().toISOString();
  const entry = `\n## ${timestamp}\n\n${markdownEntry}\n`;

  fs.appendFileSync(LOG_FILE, entry, 'utf8');
  console.log(`✅ Appended entry to log:\n${entry}`);
}
