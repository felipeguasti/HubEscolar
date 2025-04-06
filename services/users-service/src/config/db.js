const Sequelize = require('sequelize');

// Credenciais do banco de dados externo
// const database = "u612973268_broadcast";
// const username = "u612973268_broadcast";
// const password = "E1=iTrLXsvk";
// const host = "195.35.61.61"; // Endereço IP do banco de dados externo
// const dialect = "mysql";

// Credenciais do banco de dados (obtidas das variáveis de ambiente)
const database = process.env.MYSQL_DATABASE || "u612973268_broadcast";
const username = process.env.MYSQL_USER || "u612973268_broadcast";
const password = process.env.MYSQL_PASSWORD || "E1=iTrLXsvk";
const host = process.env.MYSQL_HOST || "localhost"; // Padrão: localhost
const dialect = process.env.MYSQL_DIALECT || "mysql";

// Inicializar a conexão com o banco de dados
const sequelize = new Sequelize(database, username, password, {
    host: host,
    dialect: dialect,
    logging: false, // Define se as mensagens de log do Sequelize serão exibidas (desabilitado neste caso)
});

// Testar a conexão
sequelize.authenticate()
    .then(() => {
        console.log('Conexão com MySQL estabelecida com sucesso! (Banco de dados local)');
    })
    .catch(err => {
        console.error('Erro ao conectar ao MySQL: (Banco de dados local)', err);
    });

// Exportar a instância do Sequelize para ser utilizada em outras partes do projeto
module.exports = sequelize;