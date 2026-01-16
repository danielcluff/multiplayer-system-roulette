// Game constants shared between server and client

export const GAME_CONFIG = {
  PROCESS_COUNT: 25,           // Number of processes per game
  SPIN_DURATION: 3000,         // Duration of spin animation in ms
  SPIN_DECELERATION: 0.95,     // How quickly the spin slows down
  MIN_SPIN_INTERVAL: 50,       // Minimum ms between process changes during spin
  MAX_SPIN_INTERVAL: 500,      // Maximum ms between process changes (at end of spin)
};

// WebSocket message types
export const MSG_TYPES = {
  // Client -> Server
  JOIN: 'join',
  SPIN: 'spin',

  // Server -> Client
  WAITING: 'waiting',
  GAME_START: 'gameStart',
  TURN_UPDATE: 'turnUpdate',
  SPIN_RESULT: 'spinResult',
  GAME_OVER: 'gameOver',
  OPPONENT_DISCONNECTED: 'opponentDisconnected',
  ERROR: 'error',
};

// Critical system processes that trigger BSOD
export const CRITICAL_PROCESSES = [
  'kernel32.sys',
  'ntoskrnl.exe',
  'csrss.exe',
  'system.exe',
  'smss.exe',
  'wininit.exe',
  'services.exe',
  'lsass.exe',
  'winlogon.exe',
  'hal.dll',
];

// Non-critical process name parts for generation
export const PROCESS_PREFIXES = [
  'svchost', 'chrome', 'firefox', 'explorer', 'dwm',
  'conhost', 'taskhostw', 'sihost', 'ctfmon', 'RuntimeBroker',
  'SearchIndexer', 'spoolsv', 'audiodg', 'fontdrvhost', 'dasHost',
  'WmiPrvSE', 'dllhost', 'msdtc', 'SecurityHealthService', 'OneDrive',
  'Teams', 'Slack', 'Discord', 'Spotify', 'Steam',
  'node', 'python', 'java', 'Code', 'nvcontainer',
];

export const PROCESS_EXTENSIONS = ['.exe', '.dll', '.sys'];
