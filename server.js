const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');

const app = express();
const PORT = process.env.PORT || 10000;

// CONFIGURAZIONE SUPABASE
const SUPABASE_URL = 'https://crcppwugcklklqskdp.supabase.co'; 
const SUPABASE_KEY = 'sb_publishable_wgcNf0zUagrbVwB7_dJE9Q_2VUMBeOv'; 
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// INTERFACCIA COMPLETA STILE SPOTIFY
app.get('/', async (req, res) => {
    // Recuperiamo la lista delle canzoni già scaricate nel bucket per mostrarle nella Home
    let canzoniSalvate = [];
    try {
        const { data, error } = await supabase.storage.from('musica').list('', { limit: 100 });
        if (!error && data) {
            canzoniSalvate = data.filter(f => f.name.endsWith('.mp3')).map(f => {
                const { data: pUrl } = supabase.storage.from('musica').getPublicUrl(f.name);
                return { name: f.name.replace(/_/g, ' ').replace('.mp3', ''), url: pUrl.publicUrl };
            });
        }
    } catch (e) { console.log(e); }

    res.send(`
        <!DOCTYPE html>
        <html lang="it">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Spotify Cloud</title>
            <style>
                body { margin: 0; font-family: 'Segoe UI', sans-serif; background: #121212; color: white; display: flex; flex-direction: column; height: 100vh; overflow: hidden; }
                .main-container { display: flex; flex: 1; overflow: hidden; }
                .sidebar { width: 240px; background: #000; padding: 20px; display: flex; flex-direction: column; gap: 20px; }
                .sidebar a { color: #b3b3b3; text-decoration: none; font-weight: bold; font-size: 16px; display: flex; align-items: center; gap: 10px; transition: 0.2s; }
                .sidebar a:hover, .sidebar a.active { color: #fff; }
                .content { flex: 1; background: linear-gradient(to bottom, #1c1c1c, #121212); padding: 30px; overflow-y: auto; padding-bottom: 120px; }
                .search-box { display: flex; gap: 10px; margin-bottom: 30px; max-width: 500px; }
                input[type="text"] { flex: 1; padding: 12px 20px; border-radius: 50px; border: none; background: #242424; color: white; font-size: 14px; outline: none; }
                button { background: #1DB954; color: white; border: none; padding: 12px 25px; border-radius: 50px; font-weight: bold; cursor: pointer; transition: 0.2s; }
                button:hover { transform: scale(1.05); background: #1ed760; }
                .section-title { font-size: 24px; margin-bottom: 20px; font-weight: bold; }
                .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 20px; }
                .card { background: #181818; padding: 15px; border-radius: 8px; transition: 0.3s; cursor: pointer; position: relative; text-align: left; }
                .card:hover { background: #282828; }
                .card img { width: 100%; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 8px 16px rgba(0,0,0,0.5); }
                .card-title { font-weight: bold; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
                .player-bar { position: fixed; bottom: 0; left: 0; right: 0; height: 90px; background: #181818; border-top: 1px solid #282828; display: flex; align-items: center; justify-content: space-between; padding: 0 20px; box-sizing: border-box; }
                .track-info { display: flex; align-items: center; gap: 15px; width: 30%; }
                .track-title { font-size: 14px; font-weight: bold; }
                .controls { width: 40%; display: flex; flex-direction: column; align-items: center; gap: 8px; }
                audio { width: 100%; max-width: 500px; filter: invert(0.8); }
                #status { color: #1DB954; font-size: 14px; margin-top: 10px; font-weight: bold; }
                @media (max-width: 768px) {
                    .sidebar { display: none; }
                    .player-bar { height: 110px; flex-direction: column; justify-content: center; gap: 10px; padding: 10px; }
                    .track-info { width: 100%; text-align: center; justify-content: center; }
                    .controls { width: 100%; }
                }
            </style>
        </head>
        <body>
            <div class="main-container">
                <div class="sidebar">
                    <a href="#" class="active">🏠 Home</a>
                    <a href="#">🔍 Ricerca</a>
                    <a href="#">📚 La tua libreria</a>
                </div>
                <div class="content">
                    <div class="section-title">Cerca e scarica nuove canzoni</div>
                    <div class="search-box">
                        <input type="text" id="query" placeholder="Cosa vuoi ascoltare? (Es: Baby Gang - Mentalità)">
                        <button onclick="cercaCanzone()">Scarica</button>
                    </div>
                    <div id="status"></div>

                    <div class="section-title" style="margin-top: 40px;">La tua libreria Cloud</div>
                    <div class="grid">
                        ${canzoniSalvate.map(c => `
                            <div class="card" onclick="avviaPlayer('${c.name}', '${c.url}')">
                                <img src="https://zpygocgshqfytgpewuzm.supabase.co/storage/v1/object/public/immagini/default_cover.png" onerror="this.src='https://placehold.co/150x150/282828/fff?text=Music'">
                                <div class="card-title">${c.name}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="player-bar">
                <div class="track-info">
                    <div>
                        <div class="track-title" id="current-title">Nessuna canzone in riproduzione</div>
                    </div>
                </div>
                <div class="controls">
                    <audio id="audio-player" controls autoplay></audio>
                </div>
                <div style="width: 30%;"></div>
            </div>

            <script>
                function avviaPlayer(title, url) {
                    document.getElementById('current-title').innerText = title;
                    const player = document.getElementById('audio-player');
                    player.src = url;
                    player.play();
                }

                async function cercaCanzone() {
                    const q = document.getElementById('query').value;
                    if(!q) return;
                    const status = document.getElementById('status');
                    status.innerText = "🔍 Ricerca ed estrazione in corso su YouTube... Attendi circa 15-30 secondi...";
                    
                    try {
                        const res = await fetch('/download?q=' + encodeURIComponent(q));
                        const data = await res.json();
                        if(data.success) {
                            status.innerText = "✅ Canzone aggiunta con successo! Rinfresco la pagina...";
                            setTimeout(() => location.reload(), 1500);
                        } else {
                            status.innerText = "❌ Errore durante il download: " + data.error;
                        }
                    } catch(e) {
                        status.innerText = "❌ Errore di connessione al server.";
                    }
                }
            </script>
        </body>
        </html>
    `);
});

// MOTORE DI DOWNLOAD ED ESTRAZIONE AUDIO VIA API STABILE
app.get('/download', async (req, res) => {
    const query = req.query.q;
    if (!query) return res.json({ success: false, error: 'Query mancante' });

    const fileName = `${query.toLowerCase().replace(/[^a-z0-9]/g, '_')}.mp3`;

    try {
        // 1. Controllo se esiste già su Supabase
        const { data: fileData } = supabase.storage.from('musica').getPublicUrl(fileName);
        const check = await axios.head(fileData.publicUrl).catch(() => null);
        if (check && check.status === 200) {
            return res.json({ success: true, url: fileData.publicUrl });
        }

        // 2. Sfruttiamo un'API di conversione YouTube a MP3 pubblica e stabile per fare il lavoro pesante
        const searchApi = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://chulapi.vercel.app/api/yt?q=${query}`)}`;
        const searchRes = await axios.get(searchApi);
        const resData = JSON.parse(searchRes.data.contents);

        if (!resData || !resData.mp3) {
            throw new Error("Impossibile estrarre l'audio da questa ricerca. Prova a specificare meglio l'artista.");
        }

        // 3. Scarichiamo l'MP3 convertito temporaneamente in formato Buffer
        const mp3Response = await axios({
            method: 'get',
            url: resData.mp3,
            responseType: 'arraybuffer'
        });

        const buffer = Buffer.from(mp3Response.data, 'binary');

        // 4. Carichiamo il file sul Bucket 'musica' di Supabase
        const { error: uploadError } = await supabase.storage
            .from('musica')
            .upload(fileName, buffer, {
                contentType: 'audio/mpeg',
                upsert: true
            });

        if (uploadError) throw uploadError;

        res.json({ success: true, url: fileData.publicUrl });

    } catch (error) {
        console.error(error);
        res.json({ success: false, error: error.message || 'Errore interno del server' });
    }
});

app.listen(PORT, () => {
    console.log(`Server attivo sulla porta ${PORT}`);
});
