/**
 * Helper to run Python services
 */
const { exec } = require('child_process');
const util = require('util');
const path = require('path');
const execPromise = util.promisify(exec);

/**
 * Run Python script and return JSON result
 */
async function runPythonScript(scriptPath, args = []) {
    try {
        const pythonPath = process.env.PYTHON_PATH || 'python';
        const command = `${pythonPath} "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`;
        
        const { stdout, stderr } = await execPromise(command, {
            cwd: path.dirname(scriptPath),
            maxBuffer: 10 * 1024 * 1024 // 10MB
        });
        
        if (stderr) {
            console.warn('Python stderr:', stderr);
        }
        
        // Try to parse JSON from stdout
        try {
            return JSON.parse(stdout.trim());
        } catch (e) {
            // If not JSON, return as string
            return stdout.trim();
        }
    } catch (error) {
        console.error('Error running Python script:', error);
        throw error;
    }
}

module.exports = { runPythonScript };

