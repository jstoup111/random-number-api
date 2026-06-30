const { createApp } = require('./src/app');
const { createDb, createFallbackDb } = require('./src/db');

const PORT = process.env.PORT || 3000;

// Validate PORT if it was explicitly set
if (process.env.PORT && isNaN(PORT)) {
  console.error(`Error: PORT must be a valid number, got "${process.env.PORT}"`);
  process.exit(1);
}

let db;
try {
  db = createDb('random_numbers.db');
} catch (err) {
  console.error(`Failed to initialize database: ${err.message}`);
  db = createFallbackDb();
}

const app = createApp(db);

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
