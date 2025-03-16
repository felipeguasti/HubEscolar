const app = require('./app');
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// server.js (ou onde você faz a conexão com o banco)
const sequelize = require('./src/config/db');
const User = require('./src/models/User'); // Importando o modelo User

// Sincronizando o banco de dados
sequelize.sync({ force: false }) // Não apaga os dados existentes
  .then(() => {
    console.log('Banco de dados sincronizado');
  })
  .catch((err) => {
    console.error('Erro ao sincronizar banco de dados:', err);
  });
