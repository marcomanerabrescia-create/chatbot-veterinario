const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const express = require('express');
const path = require('path');

// Configurazione Express per servire files statici
const app = express();
const PORT = process.env.PORT || 3000;

// Servire i file statici dalla directory corrente
app.use(express.static('.'));

// Route principale
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Avvio server Express
app.listen(PORT, () => {
    console.log(`🌐 Server web attivo su http://localhost:${PORT}`);
});

// Configurazione WhatsApp Client
const client = new Client({
    authStrategy: new LocalAuth({
        clientId: "studio-veterinario-bianchi"
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Dati dello Studio Veterinario
const studioInfo = {
    nome: "Studio Veterinario Bianchi",
    indirizzo: "Via Roma 123, Brescia",
    telefono: "030-123456",
    email: "info@veterinariobianchi.it",
    orari: {
        lunVen: "8:00-19:00",
        sabato: "8:00-12:00",
        domenica: "Emergenze: 10:00-12:00"
    },
    servizi: [
        "Visite generali",
        "Vaccinazioni",
        "Chirurgia",
        "Radiografie",
        "Analisi del sangue",
        "Microchip",
        "Sterilizzazioni",
        "Emergenze 24h"
    ]
};

// Prezzi indicativi
const listinoPrezzi = {
    "visita generale": "€50-80",
    "vaccinazione": "€35-60",
    "microchip": "€25",
    "sterilizzazione cane": "€180-350",
    "sterilizzazione gatto": "€120-200",
    "radiografia": "€80-120",
    "analisi sangue": "€40-80"
};

// Messaggi del chatbot
const messaggi = {
    benvenuto: `🐕 *Ciao! Sono l'assistente dello Studio Veterinario Bianchi* 🐱\n\nCome posso aiutarti oggi?\n\n📋 *Scrivi:*\n• *orari* - Orari di apertura\n• *servizi* - I nostri servizi\n• *prezzi* - Listino prezzi\n• *emergenza* - Numero emergenze\n• *appuntamento* - Prenotare visita\n• *contatti* - Info di contatto\n• *aiuto* - Vedere questo menu`,
    
    orari: `🕒 *ORARI DI APERTURA*\n\n📅 *Lunedì - Venerdì:* ${studioInfo.orari.lunVen}\n📅 *Sabato:* ${studioInfo.orari.sabato}\n📅 *Domenica:* ${studioInfo.orari.domenica}\n\n❗ *Per emergenze chiamaci sempre al ${studioInfo.telefono}*`,
    
    servizi: `🏥 *I NOSTRI SERVIZI*\n\n${studioInfo.servizi.map(servizio => `• ${servizio}`).join('\n')}\n\n📞 *Per info dettagliate chiama:* ${studioInfo.telefono}`,
    
    emergenza: `🚨 *EMERGENZE 24H*\n\n📞 *Chiama subito:* ${studioInfo.telefono}\n\n⚠️ *In caso di emergenza grave, contattaci immediatamente. Siamo sempre disponibili per i nostri pazienti!*`,
    
    appuntamento: `📅 *PRENOTAZIONE APPUNTAMENTO*\n\n📞 *Chiama:* ${studioInfo.telefono}\n📧 *Email:* ${studioInfo.email}\n\n🕒 *Orari per prenotazioni:*\nLun-Ven: 8:00-19:00\nSab: 8:00-12:00\n\n💡 *Specifica:*\n• Nome del proprietario\n• Nome e tipo di animale\n• Motivo della visita`,
    
    contatti: `📍 *CONTATTI STUDIO VETERINARIO BIANCHI*\n\n🏥 *Indirizzo:* ${studioInfo.indirizzo}\n📞 *Telefono:* ${studioInfo.telefono}\n📧 *Email:* ${studioInfo.email}\n\n🕒 *Orari:*\n• Lun-Ven: ${studioInfo.orari.lunVen}\n• Sab: ${studioInfo.orari.sabato}\n• Dom: ${studioInfo.orari.domenica}`,
    
    prezzi: `💰 *LISTINO PREZZI INDICATIVO*\n\n${Object.entries(listinoPrezzi).map(([servizio, prezzo]) => `• ${servizio}: ${prezzo}`).join('\n')}\n\n📞 *Per preventivi personalizzati chiama ${studioInfo.telefono}*\n\n💡 *I prezzi possono variare in base alle necessità specifiche dell'animale*`,
    
    nonCapito: `❓ *Non ho capito la tua richiesta*\n\n📋 *Scrivi una di queste parole:*\n• *orari*\n• *servizi*\n• *prezzi*\n• *emergenza*\n• *appuntamento*\n• *contatti*\n• *aiuto*\n\n💬 *Oppure descrivi il problema del tuo animale*`
};

// Funzione per analizzare il messaggio
function analizzaMessaggio(testo) {
    const testoLower = testo.toLowerCase();
    
    if (testoLower.includes('orari') || testoLower.includes('ore') || testoLower.includes('aperto')) {
        return 'orari';
    }
    if (testoLower.includes('servizi') || testoLower.includes('servizio') || testoLower.includes('cosa fate')) {
        return 'servizi';
    }
    if (testoLower.includes('prezzi') || testoLower.includes('prezzo') || testoLower.includes('costo') || testoLower.includes('quanto')) {
        return 'prezzi';
    }
    if (testoLower.includes('emergenza') || testoLower.includes('urgente') || testoLower.includes('subito')) {
        return 'emergenza';
    }
    if (testoLower.includes('appuntamento') || testoLower.includes('prenotare') || testoLower.includes('visita')) {
        return 'appuntamento';
    }
    if (testoLower.includes('contatti') || testoLower.includes('dove') || testoLower.includes('indirizzo') || testoLower.includes('telefono')) {
        return 'contatti';
    }
    if (testoLower.includes('aiuto') || testoLower.includes('help') || testoLower.includes('menu')) {
        return 'benvenuto';
    }
    if (testoLower.includes('ciao') || testoLower.includes('salve') || testoLower.includes('buongiorno') || testoLower.includes('buonasera')) {
        return 'benvenuto';
    }
    
    return 'nonCapito';
}

// Event listeners WhatsApp
client.on('qr', (qr) => {
    console.log('📱 Scansiona questo QR code con WhatsApp Business:');
    qrcode.generate(qr, { small: true });
    console.log('\n📱 Apri WhatsApp Business > Menu > Dispositivi collegati > Collega dispositivo');
});

client.on('ready', () => {
    console.log('✅ Chatbot Studio Veterinario Bianchi attivo!');
    console.log('🐕 Pronto a ricevere messaggi WhatsApp Business');
});

client.on('authenticated', () => {
    console.log('🔐 Autenticazione WhatsApp riuscita');
});

client.on('auth_failure', (msg) => {
    console.error('❌ Errore autenticazione WhatsApp:', msg);
});

client.on('disconnected', (reason) => {
    console.log('⚠️ WhatsApp disconnesso:', reason);
});

// Gestione messaggi in arrivo
client.on('message', async (message) => {
    try {
        // Evita di rispondere ai propri messaggi
        if (message.fromMe) return;
        
        // Evita messaggi di gruppo (opzionale)
        const chat = await message.getChat();
        if (chat.isGroup) return;
        
        const testoMessaggio = message.body.trim();
        console.log(`📨 Messaggio ricevuto da ${message.from}: ${testoMessaggio}`);
        
        // Analizza il messaggio e determina la risposta
        const tipoRisposta = analizzaMessaggio(testoMessaggio);
        const risposta = messaggi[tipoRisposta];
        
        // Simula typing (opzionale)
        await chat.sendStateTyping();
        
        // Piccolo delay per sembrare più naturale
        setTimeout(async () => {
            await message.reply(risposta);
            console.log(`✅ Risposta inviata: ${tipoRisposta}`);
        }, 1000 + Math.random() * 2000); // Delay tra 1-3 secondi
        
    } catch (error) {
        console.error('❌ Errore gestione messaggio:', error);
        try {
            await message.reply('🔧 *Servizio temporaneamente non disponibile*\n\nPer assistenza immediata chiama: ' + studioInfo.telefono);
        } catch (replyError) {
            console.error('❌ Errore invio messaggio di errore:', replyError);
        }
    }
});

// Gestione errori globali
process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

// Avvio client WhatsApp
console.log('🚀 Avvio chatbot Studio Veterinario Bianchi...');
client.initialize();

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⏹️ Spegnimento chatbot...');
    await client.destroy();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⏹️ Terminazione chatbot...');
    await client.destroy();
    process.exit(0);
});
