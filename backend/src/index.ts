import app from './app';
import { env } from './config/env';
import { initCronJobs } from './config/cron';
import { initWebSocketServer } from './services/websocket.service';

const PORT = env.PORT || 5000;

const server = app.listen(PORT, () => {
  console.log(`[server]: InvestX Backend is running at http://localhost:${PORT}`);
  console.log(`[server]: Environment: ${env.NODE_ENV}`);

  // Initialize cron jobs
  initCronJobs();
});

// Initialize WebSocket proxy server for Finnhub
initWebSocketServer(server);
