const express = require('express');
const axios = require('axios');
const mysql = require('mysql2');

// Configurações do banco de dados
const db = mysql.createPool({
    host: 'sensordb.cpum6aqq2r5m.eu-north-1.rds.amazonaws.com',
    user: 'Cassiano',
    password: 'cassiano3241',
    database: 'distances_db'
});

// Configurações do ThingSpeak
const THINGSPEAK_API_KEY = '8PHTQ285VBUY0ANO';
const THINGSPEAK_CHANNEL_ID = '2762979';
const THINGSPEAK_URL = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_API_KEY}&results=1`;

const app = express();
const PORT = 9000;

// Distância fixa em cm
const FIXED_DISTANCE_CM = 135;

// Rota para obter dados do ThingSpeak e salvar no banco
app.get('/save-distances', async (req, res) => {
    try {
        // Requisição ao ThingSpeak
        const response = await axios.get(THINGSPEAK_URL);
        const feeds = response.data.feeds;

        if (!feeds || feeds.length === 0) {
            return res.status(404).send('Nenhum dado encontrado no ThingSpeak.');
        }

        // Extrair os valores das fields
        const latestFeed = feeds[0];
        const field1 = parseFloat(latestFeed.field1); // Distância local
        const field2 = parseFloat(latestFeed.field2); // Distância remota

        if (isNaN(field1) || isNaN(field2)) {
            return res.status(400).send('Dados inválidos recebidos do ThingSpeak.');
        }

        // Calcular as distâncias
        const localDistance = (FIXED_DISTANCE_CM - field1) / 100; // Converter para metros
        const remoteDistance = (FIXED_DISTANCE_CM - field2) / 100; // Converter para metros

        // Inserir no banco de dados
        const sql = `INSERT INTO distances (local_distance, remote_distance) VALUES (?, ?)`;
        db.query(sql, [localDistance, remoteDistance], (err, result) => {
            if (err) {
                console.error('Erro ao salvar no banco:', err);
                return res.status(500).send('Erro ao salvar os dados no banco de dados.');
            }
            res.send({
                message: 'Dados salvos com sucesso!',
                data: { localDistance, remoteDistance },
                dbResult: result
            });
        });
    } catch (error) {
        console.error('Erro ao acessar ThingSpeak:', error);
        res.status(500).send('Erro ao acessar ThingSpeak.');
    }
});

// Inicializar o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
