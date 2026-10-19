import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const logDirectory = path.join(projectRoot, 'logs');
const logFile = path.join(logDirectory, 'console-diagnostics.log');
const maxLogBytes = 5 * 1024 * 1024;
const retainedLogs = 3;

function redact(value) {
  return String(value ?? '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, '[URL REDACTED]')
    .replace(/\b(key|token|password|secret|authorization)\s*[:=]\s*[^\s,;]+/gi, '$1=[REDACTED]')
    .replace(/(STEAM_WEB_API_KEY\s*=\s*)[^\s]+/gi, '$1[REDACTED]')
    .slice(0, 1200);
}

function safeError(error) {
  if (!error) return undefined;
  const source = error instanceof Error ? error : new Error(String(error));
  return {
    name: redact(source.name || 'Error').slice(0, 100),
    message: redact(source.message),
    code: /^[A-Z0-9_-]{1,80}$/i.test(String(source.code || '')) ? String(source.code) : undefined,
    status: Number.isInteger(source.status) ? source.status : undefined,
  };
}

function rotateIfNeeded(incomingBytes) {
  try {
    if (!fs.existsSync(logFile) || fs.statSync(logFile).size + incomingBytes <= maxLogBytes) return;
    for (let index = retainedLogs - 1; index >= 1; index--) {
      const older = `${logFile}.${index}`;
      const newer = `${logFile}.${index + 1}`;
      if (fs.existsSync(newer)) fs.rmSync(newer, { force: true });
      if (fs.existsSync(older)) fs.renameSync(older, newer);
    }
    fs.renameSync(logFile, `${logFile}.1`);
  } catch (error) {
    console.error('[DIAG-0003] Log rotation failed:', redact(error.message));
  }
}

export function diagnostic(code, message, error = null, level = 'ERROR', details = undefined) {
  const safeCode = /^[A-Z0-9_-]{1,80}$/i.test(String(code)) ? String(code) : 'DIAG-INVALID-CODE';
  const record = {
    time: new Date().toISOString(),
    level: ['INFO', 'WARN', 'ERROR', 'FATAL'].includes(level) ? level : 'ERROR',
    code: safeCode,
    message: redact(message),
    ...(error ? { error: safeError(error) } : {}),
    ...(details && typeof details === 'object' ? { details: Object.fromEntries(
      Object.entries(details).slice(0, 12).map(([key, value]) => [
        redact(key).slice(0, 80),
        typeof value === 'number' || typeof value === 'boolean' || value === null
          ? value
          : redact(typeof value === 'string' ? value : JSON.stringify(value)).slice(0, 300),
      ])
    ) } : {}),
  };
  const line = JSON.stringify(record);
  const output = `[${record.level}] [${safeCode}] ${record.message}`;
  if (record.level === 'WARN') console.warn(output);
  else if (record.level === 'INFO') console.info(output);
  else console.error(output);

  try {
    fs.mkdirSync(logDirectory, { recursive: true });
    rotateIfNeeded(Buffer.byteLength(line + '\n', 'utf8'));
    fs.appendFileSync(logFile, line + '\n', { encoding: 'utf8', mode: 0o600 });
  } catch (writeError) {
    console.error('[DIAG-0002] Could not write diagnostic log:', redact(writeError.message));
  }
}

export function diagnosticEvent(code, message, details = undefined, level = 'INFO') {
  diagnostic(code, message, null, level, details);
}

export const diagnosticLogPath = logFile;
