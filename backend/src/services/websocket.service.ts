import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';

const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY;

// Type definitions
interface ClientSubscription {
  ws: WebSocket;
  symbols: Set<string>;
}

// Global active subscriptions state
const clients = new Set<ClientSubscription>();
const activeSymbols = new Set<string>();

// Finnhub direct connection OR Mock connection
let finnhubWs: WebSocket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let mockInterval: NodeJS.Timeout | null = null;

const connectFinnhub = () => {
  if (!FINNHUB_API_KEY) {
    console.warn('[WS] Missing FINNHUB_API_KEY. Starting Mock Market Mode.');
    
    if (mockInterval) clearInterval(mockInterval);
    
    // Simulate ticks every 1.5 seconds for all active symbols
    mockInterval = setInterval(() => {
      const mockData = Array.from(activeSymbols).map(symbol => {
        // Generate a random mock price (just noise around $100 for simulation)
        const price = 100 + (Math.random() * 20 - 10);
        return { p: price, s: symbol, t: Date.now(), v: Math.floor(Math.random() * 50) + 1 };
      });

      if (mockData.length > 0) {
        const payload = JSON.stringify({ type: 'trade', data: mockData });
        mockData.forEach(trade => broadcastToSubscribers(trade.s, payload));
      }
    }, 1500);

    return;
  }

  finnhubWs = new WebSocket(`wss://ws.finnhub.io?token=${FINNHUB_API_KEY}`);

  finnhubWs.on('open', () => {
    console.log('[WS] Connected to Finnhub Real-Time API.');
    
    // Resubscribe to all currently active symbols needed by our clients
    activeSymbols.forEach(symbol => {
      finnhubWs?.send(JSON.stringify({ type: 'subscribe', symbol }));
    });
  });

  finnhubWs.on('message', (data: WebSocket.RawData) => {
    const rawData = data.toString();
    try {
      const parsed = JSON.parse(rawData);
      
      // We only care about trade ticks
      if (parsed.type === 'trade' && parsed.data) {
        // Broadcast the trade to any client subscribed to its symbol
        parsed.data.forEach((trade: any) => {
          const symbol = trade.s;
          broadcastToSubscribers(symbol, rawData);
        });
      }
    } catch (e) {
      console.error('[WS] Error parsing Finnhub message:', e);
    }
  });

  finnhubWs.on('error', (error) => {
    console.error('[WS] Finnhub connection error:', error);
  });

  finnhubWs.on('close', () => {
    console.log('[WS] Finnhub connection closed. Attempting to reconnect in 5s...');
    finnhubWs = null;
    clearTimeout(reconnectTimer as NodeJS.Timeout);
    reconnectTimer = setTimeout(connectFinnhub, 5000);
  });
};

const updateFinnhubSubscriptions = (symbol: string, subscribe: boolean) => {
  if (subscribe) {
    activeSymbols.add(symbol);
    if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
      finnhubWs.send(JSON.stringify({ type: 'subscribe', symbol }));
    }
  } else {
    // Only unsubscribe if NO OTHER client is listening to this symbol
    let isStillNeeded = false;
    for (const client of clients) {
      if (client.symbols.has(symbol)) {
        isStillNeeded = true;
        break;
      }
    }

    if (!isStillNeeded) {
      activeSymbols.delete(symbol);
      if (finnhubWs && finnhubWs.readyState === WebSocket.OPEN) {
        finnhubWs.send(JSON.stringify({ type: 'unsubscribe', symbol }));
      }
    }
  }
};

const broadcastToSubscribers = (symbol: string, messageString: string) => {
  for (const client of clients) {
    if (client.symbols.has(symbol) && client.ws.readyState === WebSocket.OPEN) {
      client.ws.send(messageString);
    }
  }
};

/**
 * Attaches the WebSocket proxy server to the existing HTTP Express server.
 */
export const initWebSocketServer = (server: Server) => {
  const wss = new WebSocketServer({ server });

  console.log('[WS] Local WebSocket proxy server initialized');

  wss.on('connection', (ws: WebSocket) => {
    const clientState: ClientSubscription = { ws, symbols: new Set() };
    clients.add(clientState);

    ws.on('message', (message: WebSocket.RawData) => {
      try {
        const data = JSON.parse(message.toString());
        
        // Client wants to subscribe
        if (data.type === 'subscribe' && data.symbol) {
          const symbol = data.symbol.toUpperCase();
          clientState.symbols.add(symbol);
          updateFinnhubSubscriptions(symbol, true);
        }
        
        // Client wants to unsubscribe
        if (data.type === 'unsubscribe' && data.symbol) {
          const symbol = data.symbol.toUpperCase();
          clientState.symbols.delete(symbol);
          updateFinnhubSubscriptions(symbol, false);
        }
      } catch (e) {
        console.error('[WS] Error processing client message:', e);
      }
    });

    ws.on('close', () => {
      // Clean up when client disconnects
      const removedSymbols = Array.from(clientState.symbols);
      clients.delete(clientState);
      
      // Update upstream Finnhub connection for each symbol they were tracking
      removedSymbols.forEach(symbol => {
        updateFinnhubSubscriptions(symbol, false);
      });
    });
  });

  // Start the upstream connection
  connectFinnhub();
};
