const express = require('express');
const path = require('path');
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const client = require('twilio')(accountSid, authToken);

// Configurazione Express
const app = express();
const PORT = process.env.PORT || 3000;

// Servire file statici
app.use(express.static('.'));
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
    benvenuto: `🐕 *Ciao! Sono l'assistente dello

