const express = require('express');
const axios = require('axios');
const mysql = require('mysql2/promise');

// Configurações do banco de dados
const dbConfig = {
    host: 'sensordb.cpum6aqq2r5m.eu-north-1.rds.amazonaws.com',
    user: 'Cassiano',
    password: 'cassiano3241',
    database: 'distances_db'
};

// Configuração do ThingSpeak
const THINGSPEAK_URL = 'https://api.thingspeak.com/channels/2762979/feeds.json?api_key=8PHTQ285VBUY0ANO&results=1';
const FIXED_DISTANCE = 1.35; // Distância fixa, como exemplo (em metros)

const app = express();
const port = 3000;

// Função para salvar as distâncias no banco de dados
async function saveDistances() {
  try {
    console.log("Iniciando processo de verificação e salvamento de dados...");

    // Requisição ao ThingSpeak
    const response = await axios.get(THINGSPEAK_URL);
    const data = response.data;

    if (!data.feeds || data.feeds.length === 0) {
      console.log("Nenhum dado encontrado no ThingSpeak.");
      return;
    }

    const feed = data.feeds[0];
    const field1 = parseFloat(feed.field1); // Local sensor
    const field2 = parseFloat(feed.field2); // Remote sensor

    const localDistance = (field1 / -100 + FIXED_DISTANCE).toFixed(2); // Distância local em metros
    const remoteDistance = (field2 / -100 + FIXED_DISTANCE).toFixed(2); // Distância remota em metros

    console.log(`Distância local calculada: ${localDistance} m`);
    console.log(`Distância remota calculada: ${remoteDistance} m`);

    // Conexão com o banco de dados
    const connection = await mysql.createConnection(dbConfig);

    // Configurar fuso horário do MySQL para São Paulo
    await connection.query("SET time_zone = '-03:00';");

    // Inserção no banco usando NOW() para o timestamp atual
    const [result] = await connection.execute(
      "INSERT INTO distances (local_distance, remote_distance, created_at) VALUES (?, ?, NOW())",
      [localDistance, remoteDistance]
    );
    console.log("Dados salvos no banco de dados com sucesso:", result);

    // Fechar a conexão com o banco
    await connection.end();
  } catch (error) {
    console.error("Erro ao salvar distâncias:", error.message);
  }
}

// Rota para salvar as distâncias
app.get('/save-distances', async (req, res) => {
  try {
    console.log("Fazendo a requisição para o ThingSpeak...");

    // Requisição ao ThingSpeak
    const response = await axios.get(THINGSPEAK_URL);
    const data = response.data;

    if (!data.feeds || data.feeds.length === 0) {
      res.status(400).json({ message: "Nenhum dado encontrado no ThingSpeak." });
      return;
    }

    const feed = data.feeds[0];
    const field1 = parseFloat(feed.field1); // Local sensor
    const field2 = parseFloat(feed.field2); // Remote sensor

    const localDistance = (field1 / 100 - FIXED_DISTANCE).toFixed(2); // Distância local em metros
    const remoteDistance = (field2 / 100 - FIXED_DISTANCE).toFixed(2); // Distância remota em metros

    console.log(`Distância local calculada: ${localDistance} m`);
    console.log(`Distância remota calculada: ${remoteDistance} m`);

    // Conexão com o banco de dados
    const connection = await mysql.createConnection(dbConfig);

    // Configurar fuso horário do MySQL para São Paulo
    await connection.query("SET time_zone = '-03:00';");

    // Inserção no banco usando NOW() para o timestamp atual
    const [result] = await connection.execute(
      "INSERT INTO distances (local_distance, remote_distance, created_at) VALUES (?, ?, NOW())",
      [localDistance, remoteDistance]
    );

    // Fechar a conexão com o banco
    await connection.end();

    console.log("Dados salvos no banco de dados com sucesso:", result);

    // Resposta de sucesso
    res.json({
      message: 'Dados salvos com sucesso!',
      data: { localDistance, remoteDistance, field1: field1, field2: field2 },
      dbResult: result,
    });
  } catch (error) {
    console.error("Erro ao salvar distâncias:", error.message);
    res.status(500).json({ message: "Erro ao salvar distâncias." });
  }
});

// Função de loop que verifica e salva as distâncias a cada minuto
setInterval(saveDistances, 60000); // A cada 1 minuto (60000ms)

// Inicializar o servidor
app.listen(port, () => {
  console.log(`Servidor rodando na porta ${port}`);
  console.log("Testando conexão com o banco de dados...");
  mysql.createConnection(dbConfig)
    .then(() => {
      console.log("Conexão com o banco de dados bem-sucedida!");
    })
    .catch(err => {
      console.error("Erro ao conectar com o banco de dados:", err.message);
    });
});
