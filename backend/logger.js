// Ring buffer to store recent logs
const MAX_LOGS = 1000;
const logs = [];
function addLog(message) {
    logs.push(message);
    if (logs.length > MAX_LOGS) {
        logs.shift();
    }
}
// Override console methods
const originalLog = console.log;
const originalError = console.error;
const originalWarn = console.warn;
console.log = (...args) => {
    const message = `[LOG] ${new Date().toISOString()} - ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
    addLog(message);
    originalLog(...args);
};
console.error = (...args) => {
    const message = `[ERROR] ${new Date().toISOString()} - ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
    addLog(message);
    originalError(...args);
};
console.warn = (...args) => {
    const message = `[WARN] ${new Date().toISOString()} - ${args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ')}`;
    addLog(message);
    originalWarn(...args);
};
export function getLogs() {
    return [...logs];
}
export function clearLogs() {
    logs.length = 0;
}
//# sourceMappingURL=logger.js.map