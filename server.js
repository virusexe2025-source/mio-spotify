const express = require('express');
const ytStream = require('yt-stream');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// CONFIGURAZIONE SUPABASE
// Sostituisci i dati qui sotto con quelli presi dal tuo pannello
// ==========================================
const SUPABASE_URL = 'https://crcppwugcklklqskdp.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_wgcNf0zUagrbVwB7_dJE9Q_2VUMBeOv'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 1. INTERFACCIA GRAFICA (PER IL TELEFONO)
// ==========================================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Mio Spotify Cloud</title>
            <style>
                body { 
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
                    text-align: center; 
                    background: #121212; 
                    color: white; 
                    padding: 40px 20px;
                    margin: 0;
                }
                .container {
                    max-width: 500px;
                    margin: 0 auto;
                    background: #181818;
                    padding: 30px;
                    border-radius: 12px;
                    box-shadow: 0 4px 15px rgba(0,0,0,0.5);
                }
                h2 { color: #1DB954; margin-bottom: 25px; }
                input[type="text"] { 
                    width: 90%; 
                    padding: 14px; 
                    margin-bottom: 15px; 
                    border-radius: 25px; 
                    border: 1px solid #333; 
                    background: #282828; 
                    color: white;
                    font-size: 16px;
                    outline: none;
                    text-align: center;
                }
                input[type="text"]:focus {
                    border-color: #1DB954;
                }
                button { 
                    background: #1DB954; 
                    color: white; 
                    font-weight: bold; 
                    font-size: 16px;
                    padding: 14px 30px; 
                    border: none; 
                    border-radius: 25px; 
                    cursor: pointer; 
                    transition: transform 0.2s, background 0.2s;
                }
                button:hover { 
                    background: #1ed760;
                    transform: scale(1.04);
                }
                .status {
                    margin-top: 20px;
                    color: #b3b3b3;
                    font-size: 14px;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h2>Mio Spotify Cloud</h2>
                <p style="color: #b3b3b3; margin-bottom: 30px;">Inserisci il titolo di una canzone. Se non è sul server, verrà cercata e scaricata in automatico!</p>
                <form action="/play" method="GET" onsubmit="document.getElementById('msg').innerText = 'Elaborazione in corso... Attendi qualche secondo...';">
                    <input type="text" name="q" placeholder="Es: Sfera Ebbasta - Cupido" required><br>
                    <button type="submit">Cerca e Ascolta</button>
                </form>
                <div id="msg" class="status"></div>
            </div>
        </body>
        </html>
    `);
});

// ==========================================
// 2. MOTORE DI RICERCA, DOWNLOAD E CLOUD
// ==========================================
app.get('/play', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.status(400).send('Inserisci un titolo valido.');

    // Puliamo il nome del file per evitare problemi con caratteri speciali ed emoji
    const fileName = `${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp3`;

    try {
        // CONTROLLO: La canzone è già presente nel nostro archivio Supabase?
        const { data: fileData } = supabase.storage.from('musica').getPublicUrl(fileName);
        const check = await fetch(fileData.publicUrl, { method: 'HEAD' });
        
        if (check.ok) {
            console.log(`[OK] '${query}' già salvata su Supabase. Avvio riproduzione.`);
            return res.redirect(fileData.publicUrl);
        }

        // SE NON ESISTE: Avviamo la ricerca online (YouTube)
        console.log(`[DOWNLOAD] Canzone nuova. Ricerca online per: ${query}...`);
        const results = await ytStream.search(query);
        if (!results || results.length === 0) {
            return res.status(404).send('Canzone non trovata online. Riprova con un altro titolo.');
        }

        const video = results[0];
        console.log(`[STREAM] Trovato video: "${video.title}". Estrazione audio...`);
        
        const stream = await ytStream.stream(video.url, { 
            quality: 'high', 
            type: 'audio' 
        });

        // Convertiamo lo stream in un Buffer per permettere il caricamento
        const chunks = [];
        for await (const chunk of stream.stream) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);

        // CARICAMENTO: Salviamo l'MP3 nel bucket 'musica' in modo permanente
        console.log(`[CLOUD] Caricamento del file ${fileName} su Supabase Storage...`);
        const { error } = await supabase.storage
            .from('musica')
            .upload(fileName, buffer, { 
                contentType: 'audio/mpeg', 
                cacheControl: '3600', 
                upsert: true 
            });

        if (error) throw error;

        console.log(`[SUCCESS] File salvato correttamente su Supabase!`);
        
        // Prendiamo l'URL pubblico definitivo e reindirizziamo il telefono al player
        const { data } = supabase.storage.from('musica').getPublicUrl(fileName);
        res.redirect(data.publicUrl);

    } catch (error) {
        console.error('[ERRORE SERVER]:', error);
        res.status(500).send('Errore interno del server durante il download o il salvataggio.');
    }
});

// Avvio del server
app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`Server musicale attivo! Porta di ascolto: ${PORT}`);
    console.log(`=================================================`);
});