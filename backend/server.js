require('dotenv').config({ quiet: true });
const http = require('http');
const app = require('./src/app');
const connectDb = require('./src/config/database');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 4000;

async function start() {
  try {
    await connectDb();
    const server = http.createServer(app);

    server.listen(PORT, () => {
      logger.info(`RankRetros backend running on port ${PORT}`);
    });
  } catch (err) {
    logger.error('Failed to start server', err);
    process.exit(1);
  }
}

start();