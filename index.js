const app = require('./src/app');

const PORT = process.env.PORT || 3000;

// Validate PORT if it was explicitly set
if (process.env.PORT && isNaN(PORT)) {
  console.error(`Error: PORT must be a valid number, got "${process.env.PORT}"`);
  process.exit(1);
}

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
