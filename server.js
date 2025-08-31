// server.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const TelegramBot = require('node-telegram-bot-api');
const app = express();

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Variabili ambiente (.env)
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const MAKE_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL;
const PORT = process.env.PORT || 3000;

// Inizializza Telegram solo se le credenziali sono presenti
let bot = null;
if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
  bot = new TelegramBot(TELEGRAM_BOT_TOKEN, { polling: false });
  console.log("✅ Bot Telegram inizializzato");
} else {
  console.warn("⚠️ Bot Telegram non configurato - controlla TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID");
}

// Endpoint emergenza
app.post('/api/emergency', async (req, res) => {
  try {
    const { nome_cliente, telefono, messaggio, pet, posizione } = req.body;
    
    console.log("📨 Nuova emergenza ricevuta:", { nome_cliente, pet });
    
    // Array per tracciare successi/errori
    const results = [];
    
    // Invia a Make
    if (MAKE_WEBHOOK_URL) {
      try {
        const makeResponse = await fetch(MAKE_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            nome_cliente, 
            telefono, 
            messaggio, 
            pet, 
            posizione,
            timestamp: new Date().toISOString()
          })
        });
        
        if (makeResponse.ok) {
          results.push({ service: 'Make', status: 'success' });
          console.log("✅ Inviato a Make webhook");
        } else {
          results.push({ service: 'Make', status: 'failed', error: `HTTP ${makeResponse.status}` });
          console.error("❌ Make webhook ha risposto con errore:", makeResponse.status);
        }
      } catch (makeError) {
        results.push({ service: 'Make', status: 'failed', error: makeError.message });
        console.error("❌ Errore invio Make:", makeError.message);
      }
    }
    
    // Prepara messaggio Telegram
    const emergencyMessage = `
🚨 **EMERGENZA VETERINARIA** 🚨

**Cliente:** ${nome_cliente || "Non specificato"}
**Pet:** ${pet || "Non specificato"}
**Telefono:** ${telefono || "Non fornito"}
**Posizione:** ${posizione || "Non fornita"}

**Messaggio:**
"${messaggio || "Nessun messaggio fornito"}"

**Ora:** ${new Date().toLocaleString('it-IT')}
    `.trim();
    
    // Invia a Telegram
    if (bot && TELEGRAM_CHAT_ID) {
      try {
        await bot.sendMessage(TELEGRAM_CHAT_ID, emergencyMessage, {
          parse_mode: 'Markdown'
        });
        results.push({ service: 'Telegram', status: 'success' });
        console.log("✅ Inviato a Telegram");
      } catch (telegramError) {
        results.push({ service: 'Telegram', status: 'failed', error: telegramError.message });
        console.error("❌ Errore invio Telegram:", telegramError.message);
      }
    } else if (!bot) {
      console.warn("⚠️ Telegram non configurato, emergenza non inviata");
      results.push({ service: 'Telegram', status: 'not_configured' });
    }
    
    // Determina se almeno un servizio ha funzionato
    const hasSuccess = results.some(r => r.status === 'success');
    
    if (hasSuccess) {
      res.status(200).json({ 
        success: true, 
        message: "Emergenza inviata con successo",
        details: results
      });
    } else if (results.length === 0) {
      res.status(503).json({ 
        success: false, 
        message: "Nessun servizio configurato per l'invio emergenze",
        details: results
      });
    } else {
      res.status(500).json({ 
        success: false, 
        message: "Errore nell'invio dell'emergenza a tutti i servizi",
        details: results
      });
    }
    
  } catch (err) {
    console.error("❌ Errore critico invio emergenza:", err);
    res.status(500).json({ 
      success: false, 
      message: "Errore interno del server",
      error: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// Endpoint messaggi normali
app.post('/api/message', async (req, res) => {
  const { message } = req.body;
  
  if (!message) {
    return res.status(400).json({ 
      success: false, 
      message: "Nessun messaggio fornito" 
    });
  }
  
  console.log("💬 Messaggio ricevuto:", message);
  
  // Opzionale: inoltra anche a Telegram i messaggi normali
  if (bot && TELEGRAM_CHAT_ID) {
    try {
      await bot.sendMessage(
        TELEGRAM_CHAT_ID, 
        `💬 **Messaggio ricevuto:**\n${message}`,
        { parse_mode: 'Markdown' }
      );
    } catch (err) {
      console.error("Errore invio messaggio a Telegram:", err.message);
    }
  }
  
  res.json({ 
    success: true,
    response: `✅ Ho ricevuto il tuo messaggio: "${message}"`,
    timestamp: new Date().toISOString()
  });
});

// Endpoint di test per verificare la configurazione
app.get('/api/test', async (req, res) => {
  console.log("🧪 Test configurazione richiesto");
  
  const tests = {
    telegram: { configured: false, working: false, error: null },
    make: { configured: false, working: false, error: null }
  };
  
  // Test Telegram
  if (TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID) {
    tests.telegram.configured = true;
    if (bot) {
      try {
        const botInfo = await bot.getMe();
        await bot.sendMessage(
          TELEGRAM_CHAT_ID, 
          `🧪 **Test Configurazione**\nBot: @${botInfo.username}\nStato: ✅ Funzionante\nOra: ${new Date().toLocaleString('it-IT')}`,
          { parse_mode: 'Markdown' }
        );
        tests.telegram.working = true;
        console.log("✅ Test Telegram riuscito");
      } catch (err) {
        tests.telegram.error = err.message;
        console.error("❌ Test Telegram fallito:", err.message);
      }
    }
  }
  
  // Test Make webhook (solo verifica se configurato)
  if (MAKE_WEBHOOK_URL) {
    tests.make.configured = true;
    // Non facciamo una chiamata reale per non triggerare il workflow
    tests.make.working = 'not_tested';
    console.log("ℹ️ Make webhook configurato (non testato per evitare trigger)");
  }
  
  res.json({
    success: true,
    message: "Test configurazione completato",
    results: tests,
    environment: {
      nodeVersion: process.version,
      port: PORT,
      env: process.env.NODE_ENV || 'production'
    }
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      telegram: !!bot,
      make: !!MAKE_WEBHOOK_URL
    }
  });
});

// Root endpoint
app.get('/', (req, res) => {
  res.send(`
    <html>
      <head>
        <title>Server Emergenze Veterinarie</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          .status { padding: 10px; border-radius: 5px; margin: 10px 0; }
          .ok { background: #d4edda; color: #155724; }
          .warning { background: #fff3cd; color: #856404; }
        </style>
      </head>
      <body>
        <h1>🏥 Server Emergenze Veterinarie</h1>
        <div class="status ${bot ? 'ok' : 'warning'}">
          Telegram: ${bot ? '✅ Configurato' : '⚠️ Non configurato'}
        </div>
        <div class="status ${MAKE_WEBHOOK_URL ? 'ok' : 'warning'}">
          Make Webhook: ${MAKE_WEBHOOK_URL ? '✅ Configurato' : '⚠️ Non configurato'}
        </div>
        <p>
          <a href="/api/health">Health Check</a> | 
          <a href="/api/test">Test Configurazione</a>
        </p>
      </body>
    </html>
  `);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint non trovato',
    path: req.path
  });
});

// Avvio server
const server = app.listen(PORT, async () => {
  console.log(`
╔════════════════════════════════════════╗
║   🚀 Server Emergenze Veterinarie      ║
║   Porta: ${PORT}                          ║
║   Ambiente: ${process.env.NODE_ENV || 'production'}          ║
╚════════════════════════════════════════╝
  `);
  
  // Verifica configurazione all'avvio
  console.log("\n📋 Configurazione:");
  console.log(`   Telegram: ${bot ? '✅' : '❌'} ${bot ? 'Configurato' : 'Mancano TELEGRAM_BOT_TOKEN o TELEGRAM_CHAT_ID'}`);
  console.log(`   Make: ${MAKE_WEBHOOK_URL ? '✅' : '❌'} ${MAKE_WEBHOOK_URL ? 'Configurato' : 'Manca MAKE_WEBHOOK_URL'}`);
  
  // Test iniziale Telegram (solo se configurato)
  if (bot && TELEGRAM_CHAT_ID) {
    try {
      const botInfo = await bot.getMe();
      console.log(`   Bot Telegram: @${botInfo.username}`);
      
      // Messaggio di avvio opzionale
      await bot.sendMessage(
        TELEGRAM_CHAT_ID,
        `🟢 **Server Avviato**\nPorta: ${PORT}\nOra: ${new Date().toLocaleString('it-IT')}`,
        { parse_mode: 'Markdown' }
      );
      console.log("   ✅ Messaggio di avvio inviato a Telegram");
    } catch (err) {
      console.error("   ❌ Errore test Telegram:", err.message);
    }
  }
  
  console.log("\n✨ Server pronto per ricevere emergenze!");
  console.log(`   Visita http://localhost:${PORT} per il pannello di stato`);
});

// Gestione graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n⚠️ SIGTERM ricevuto, chiusura server...');
  server.close(() => {
    console.log('✅ Server chiuso correttamente');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT ricevuto, chiusura server...');
  server.close(() => {
    console.log('✅ Server chiuso correttamente');
    process.exit(0);
  });
});



