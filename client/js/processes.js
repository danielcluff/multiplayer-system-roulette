// Process data generation and management

import {
  CRITICAL_PROCESSES,
  PROCESS_PREFIXES,
  PROCESS_EXTENSIONS,
  GAME_CONFIG,
} from '../../shared/constants.js';

/**
 * Generate a random PID (Process ID)
 */
function generatePID() {
  return Math.floor(Math.random() * 60000) + 4;
}

/**
 * Generate a random non-critical process name
 */
function generateProcessName() {
  const prefix = PROCESS_PREFIXES[Math.floor(Math.random() * PROCESS_PREFIXES.length)];
  const extension = PROCESS_EXTENSIONS[Math.floor(Math.random() * PROCESS_EXTENSIONS.length)];
  const hasSuffix = Math.random() > 0.5;
  const suffix = hasSuffix ? `_${Math.floor(Math.random() * 10000)}` : '';

  return `${prefix}${suffix}${extension}`;
}

/**
 * Create a process object
 */
function createProcess(name, isCritical = false) {
  return {
    id: crypto.randomUUID(),
    name,
    pid: generatePID(),
    isCritical,
    isTerminated: false,
  };
}

/**
 * Generate a pool of processes for a game
 * Includes a mix of critical and non-critical processes
 */
export function generateProcessPool(count = GAME_CONFIG.PROCESS_COUNT) {
  const processes = [];

  // Add some critical processes (random selection, 2-4 of them)
  const criticalCount = Math.floor(Math.random() * 3) + 2;
  const shuffledCritical = [...CRITICAL_PROCESSES].sort(() => Math.random() - 0.5);

  for (let i = 0; i < criticalCount && i < shuffledCritical.length; i++) {
    processes.push(createProcess(shuffledCritical[i], true));
  }

  // Fill the rest with non-critical processes
  while (processes.length < count) {
    const name = generateProcessName();
    // Ensure no duplicate names
    if (!processes.some(p => p.name === name)) {
      processes.push(createProcess(name, false));
    }
  }

  // Shuffle the array so critical processes aren't at the beginning
  return processes.sort(() => Math.random() - 0.5);
}

/**
 * Get active (non-terminated) processes from a list
 */
export function getActiveProcesses(processes) {
  return processes.filter(p => !p.isTerminated);
}

/**
 * Terminate a process by ID
 */
export function terminateProcess(processes, processId) {
  const process = processes.find(p => p.id === processId);
  if (process) {
    process.isTerminated = true;
  }
  return process;
}

/**
 * Check if a process is critical
 */
export function isCriticalProcess(process) {
  return process?.isCritical || false;
}

/**
 * Format process for display
 */
export function formatProcessDisplay(process) {
  if (!process) return '';
  return `${process.name} (PID: ${process.pid})`;
}

/**
 * Get a random process from active processes
 */
export function getRandomActiveProcess(processes) {
  const active = getActiveProcesses(processes);
  if (active.length === 0) return null;
  return active[Math.floor(Math.random() * active.length)];
}
