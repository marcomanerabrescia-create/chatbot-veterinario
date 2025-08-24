const express = require('express');
const path = require('path');

// Configurazione Express
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware per parsing
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

// Servire file statici
app.use(express.static('.'));

// Inizializzazione Twilio solo se le credenziali sono presenti
let client;
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;

if (accountSid && authToken) {
    client = require('twilio')(accountSid, authToken);
    console.log('Twilio client initialized successfully');
} else {
    console.log('Twilio credentials not found - running without Twilio');
}

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
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
    benvenuto: `🐕 *Ciao! Sono l'assistente dello Studio Veterinario Bianchi. Come posso aiutarti?*`,
    orari: `🕐 *Orari di apertura:*\n\n📅 Lunedì-Venerdì: ${studioInfo.orari.lunVen}\n📅 Sabato: ${studioInfo.orari.sabato}\n📅 Domenica: ${studioInfo.orari.domenica}`,
    contatti: `📞 *Contatti:*\n\n📍 ${studioInfo.indirizzo}\n☎️ ${studioInfo.telefono}\n📧 ${studioInfo.email}`,
    servizi: `🏥 *I nostri servizi:*\n\n${studioInfo.servizi.map(s => `• ${s}`).join('\n')}`,
    prezzi: `💰 *Prezzi indicativi:*\n\n${Object.entries(listinoPrezzi).map(([servizio, prezzo]) => `• ${servizio}: ${prezzo}`).join('\n')}\n\n_I prezzi possono variare in base al caso specifico._`,
    emergenza: `🚨 *Per emergenze:*\n\nChiama subito: ${studioInfo.telefono}\n\nSe fuori orario, abbiamo il servizio emergenze attivo 24h nei weekend.`,
    prenotazione: `📅 *Per prenotare:*\n\nChiama: ${studioInfo.telefono}\nOppure scrivi a: ${studioInfo.email}\n\n_Ti ricontatteremo il prima possibile!_`
};

// Funzione per processare i messaggi
function processMessage(message) {
    const msg = message.toLowerCase().trim();
    
    if (msg.includes('ciao') || msg.includes('salve') || msg.includes('buongiorno') || msg.includes('buonasera')) {
        return messaggi.benvenuto;
    }
    
    if (msg.includes('orari') || msg.includes('aperto') || msg.includes('chiuso')) {
        return messaggi.orari;
    }
    
    if (msg.includes('contatti') || msg.includes('telefono') || msg.includes('indirizzo') || msg.includes('dove')) {
        return messaggi.contatti;
    }
    
    if (msg.includes('servizi') || msg.includes('cosa fate') || msg.includes('visita')) {
        return messaggi.servizi;
    }
    
    if (msg.includes('prezzi') || msg.includes('costo') || msg.includes('quanto')) {
        return messaggi.prezzi;
    }
    
    if (msg.includes('emergenza') || msg.includes('urgente') || msg.includes('aiuto')) {
        return messaggi.emergenza;
    }
    
    if (msg.includes('prenotare') || msg.includes('appuntamento') || msg.includes('prenotazione')) {
        return messaggi.prenotazione;
    }
    
    // Messaggio di default
    return `Ciao! 🐕 Posso aiutarti con:\n\n• Orari di apertura\n• Servizi disponibili\n• Prezzi\n• Contatti\n• Prenotazioni\n• Emergenze\n\nCosa ti interessa sapere?`;
}

// Endpoint per webhook Twilio
app.post('/webhook', (req, res) => {
    const twiml = new require('twilio').twiml.MessagingResponse();
    const incomingMessage = req.body.Body || '';
    
    const response = processMessage(incomingMessage);
    twiml.message(response);
    
    res.type('text/xml').send(twiml.toString());
});

// Endpoint di test per verificare che il server funzioni
app.get('/test', (req, res) => {
    res.json({
        status: 'OK',
        message: 'Server funzionante',
        twilio: accountSid && authToken ? 'Configurato' : 'Non configurato',
        timestamp: new Date().toISOString()
    });
});

// Avvio server
app.listen(PORT, () => {
    console.log(`🚀 Server avviato sulla porta ${PORT}`);
    console.log(`📍 Studio: ${studioInfo.nome}`);
    console.log(`🔧 Twilio: ${accountSid && authToken ? 'Configurato' : 'Non configurato'}`);
});
 
