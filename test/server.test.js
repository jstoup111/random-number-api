const { spawn } = require('child_process');
const path = require('path');

describe('Server startup', () => {
  it('should listen on port specified by PORT env var and log it', (done) => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    const child = spawn('node', [indexPath], {
      env: { ...process.env, PORT: '0' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      // Check if output contains the expected log message
      if (output.includes('Listening on port')) {
        child.kill();
      }
    });

    child.on('exit', () => {
      expect(output).toContain('Listening on port');
      done();
    });

    // Timeout to prevent hanging
    setTimeout(() => {
      child.kill();
    }, 5000);
  });

  it('should default to port 3000 when PORT env var is not set', (done) => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    const env = { ...process.env };
    delete env.PORT;

    const child = spawn('node', [indexPath], {
      env: env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
      if (output.includes('Listening on port 3000')) {
        child.kill();
      }
    });

    child.on('exit', () => {
      expect(output).toContain('Listening on port 3000');
      done();
    });

    // Timeout to prevent hanging
    setTimeout(() => {
      child.kill();
    }, 5000);
  });

  it('should exit with non-zero code when PORT env var is invalid', (done) => {
    const indexPath = path.join(__dirname, '..', 'index.js');
    const child = spawn('node', [indexPath], {
      env: { ...process.env, PORT: 'abc' },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';

    child.stdout.on('data', (data) => {
      output += data.toString();
    });

    child.stderr.on('data', (data) => {
      output += data.toString();
    });

    child.on('exit', (code) => {
      expect(code).not.toEqual(0);
      expect(output.toLowerCase()).toContain('error');
      done();
    });

    // Timeout to prevent hanging
    setTimeout(() => {
      child.kill();
    }, 5000);
  });

  it('should reach app.listen() even when createDb() throws at startup', (done) => {
    const fs = require('fs');
    const os = require('os');

    // Create a temporary copy of index.js that simulates createDb failure
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'startup-test-'));
    const testIndex = path.join(tmpDir, 'test-index.js');

    const appPath = path.join(__dirname, '..', 'src', 'app').replace(/\\/g, '\\\\');
    const code = `
      // Mock createDb to throw
      const Module = require('module');
      const originalRequire = Module.prototype.require;

      Module.prototype.require = function(id) {
        if (id.includes('src/db')) {
          return {
            createDb: () => {
              throw new Error('Database file cannot be read/written');
            },
            createFallbackDb: () => ({
              prepare: () => {
                throw new Error('Database unavailable');
              }
            })
          };
        }
        return originalRequire.apply(this, arguments);
      };

      // Now require the actual index.js
      const indexPath = '${path.join(__dirname, '..', 'index.js').replace(/\\/g, '\\\\')}';
      require(indexPath);

      // Give the server 1 second to start
      setTimeout(() => {
        process.exit(0);
      }, 1000);
    `;

    fs.writeFileSync(testIndex, code);

    const child = spawn('node', [testIndex], {
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: tmpDir
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('exit', (exitCode) => {
      const output = stdout + stderr;
      fs.rmSync(tmpDir, { recursive: true });

      // Verify the server started and the DB error was logged
      expect(output).toContain('Listening on port');
      expect(output).toContain('Failed to initialize database');
      done();
    });

    setTimeout(() => {
      child.kill();
      try { fs.rmSync(tmpDir, { recursive: true }); } catch (e) { }
    }, 5000);
  });
});
