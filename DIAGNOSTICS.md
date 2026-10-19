# Console diagnostics

## Log location

Runtime diagnostics are written to `logs/console-diagnostics.log` at the project root. The `logs/` directory is created automatically and is excluded from Git. When a log reaches approximately 5 MiB, it rotates through three retained archives:

- `console-diagnostics.log`
- `console-diagnostics.log.1`
- `console-diagnostics.log.2`
- `console-diagnostics.log.3`

Each line is a JSON record with an ISO timestamp, severity, event code, message, and optional safe details.

## What is recorded

- Startup configuration presence (never configuration values or secrets), critical project-file checks, backend startup, window lifecycle, focus changes, renderer startup, and process exit.
- HTTP/API request start and finish, status, duration, missing routes, and unexpected backend errors. Query strings, request bodies, cookies, authorization headers, and chat message contents are intentionally excluded.
- Steam Web API request category, success/failure, status, duration, and safe error codes. The Steam API key and full request URLs are never intentionally logged.
- Steam account configuration and installed-library manifest access attempts, missing/unreadable files, library scan summaries, and game-launch requests.
- Renderer JavaScript errors, unhandled promise rejections, failed asset loads, media playback start/end, Electron load failures, and renderer crashes.
- WebSocket connection/message types and connection closure. Message contents are not logged.

## Reproducing an issue

1. Close the console completely.
2. Start it the same way that normally triggers the problem.
3. Reproduce the crash or failed Steam request.
4. Close the console if it remains open.
5. Open `logs/console-diagnostics.log` and inspect the newest records at the bottom.
6. Share the relevant new lines, but never share the contents of `.env` or a Steam API key.

## Important limits

This is application-level diagnostics, not a Windows-wide filesystem audit. It records file operations that the console has instrumented and errors reported by Electron/the renderer; it cannot record every file access performed internally by Windows, Steam, a graphics driver, or another process. A game-launch record confirms that the launch command was issued, not that Steam confirmed the game fully started or later exited.

## Privacy and reliability

Log entries redact URLs and common secret assignments, avoid raw request URLs and request bodies, and omit error stack traces to reduce the chance of leaking credentials. Logs are local and ignored by Git. Log rotation limits disk usage; if the logger cannot write to disk, it reports the failure to the process console.
