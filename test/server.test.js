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
});
