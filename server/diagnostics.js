import fs from 'node:fs';
import path from 'node:path';

const projectRoot = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const logDirectory = path.join(projectRoot, 'logs');
const logFile = path.join(logDirectory, 'console-diagnostics.log');

function safeError(error) {
  if (error instanceof Error) {
    // Never log environment variables, request URLs, or arbitrary object contents.
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { message: String(error) };
}

export function diagnostic(code, message, error = null, level = 'ERROR') {
  const record = {
    time: new Date().toISOString(),
    level,
    code,
    message,
    ...(error ? { error: safeError(error) } : {}),
  };
  const line = JSON.stringify(record);
  const output = `[${level}] [${code}] ${message}${error instanceof Error ? `: ${error.message}` : ''}`;
  if (level === 'WARN') console.warn(output);
  else if (level === 'INFO') console.info(output);
  else console.error(output);

  try {
    fs.mkdirSync(logDirectory, { recursive: true });
    fs.appendFileSync(logFile, line + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch (writeError) {
    console.error('[GISC-DIAG-0002] Could not write diagnostic log:', writeError.message);
  }
}

export const diagnosticLogPath = logFile;
