require('dotenv').config();
const express = require('express');
const cors = require('cors');
const logger = require('./src/utils/logger');
const swaggerUi = require('swagger-ui-express');
const swaggerJsDoc = require('swagger-jsdoc');
const db = require('./src/config/db');
const { syncModels } = require('./src/models');

// Inicializar aplicação Express
const app = express();
const PORT = process.env.SYNC_SERVICE_PORT || 3008;

// Logging inicial
logger.info('Iniciando serviço de sincronização...');
logger.info(`Configurado para porta: ${PORT}`);

// Configuração básica
app.use(cors());
app.use(express.json());

// Configuração do Swagger
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API de Sincronização HubEscolar',
      version: '1.0.0',
      description: 'API para sincronização de dados de turmas e alunos do SEGES',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Servidor de Desenvolvimento',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: ['./src/routes/*.js'],
};

const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));
logger.info('Documentação Swagger configurada');

// Configuração das rotas da API
logger.info('Configurando rotas da API...');
let syncRoutes;
try {
  syncRoutes = require('./src/routes/syncRoutes');
  logger.info('Módulo de rotas carregado com sucesso');
  
  app.use('/sync', syncRoutes);
  logger.info('Rotas da API configuradas');
} catch (error) {
  logger.error('Erro ao configurar rotas da API:', error);
  // Continuar a execução mesmo com erro nas rotas
}

// Rota de saúde simplificada
app.get('/health', (req, res) => {
  logger.debug('Requisição de health check recebida');
  res.status(200).json({ 
    status: 'UP',
    service: 'sync-service',
    timestamp: new Date().toISOString()
  });
});

// Função assíncrona para inicializar o banco de dados
async function initializeDatabase() {
  try {
    logger.info('Verificando conexão com o banco de dados...');
    await db.authenticate();
    logger.info('Conexão com o banco de dados estabelecida com sucesso');

    logger.info('Sincronizando modelos...');
    await syncModels();
    logger.info('Modelos sincronizados com o banco de dados');

    return true;
  } catch (error) {
    logger.error('Erro ao inicializar banco de dados:', error);
    return false;
  }
}

// Inicializar banco de dados antes de iniciar o servidor
logger.info('Inicializando banco de dados...');
initializeDatabase()
  .then(dbInitialized => {
    if (dbInitialized) {
      logger.info('Banco de dados inicializado com sucesso');
    } else {
      logger.warn('Continuando sem inicialização completa do banco de dados');
    }

    // Inicialização do servidor após tentativa de conexão com DB
    logger.info('Iniciando servidor HTTP...');
    app.listen(PORT, () => {
      logger.info(`Servidor iniciado com sucesso na porta ${PORT}`);
      logger.info(`Endpoint de health: http://localhost:${PORT}/health`);
      logger.info(`Documentação Swagger disponível em http://localhost:${PORT}/api-docs`);
    });

    logger.info('Configuração do servidor concluída');
  })
  .catch(error => {
    logger.error('Erro fatal durante inicialização:', error);
    process.exit(1);
  });

// Adicionar após a inicialização do servidor

// Tratamento de sinais para encerramento gracioso
process.on('SIGINT', async () => {
  logger.info('Serviço de sincronização está sendo encerrado...');
  try {
    await db.close();
    logger.info('Conexões com o banco de dados fechadas');
    process.exit(0);
  } catch (error) {
    logger.error('Erro ao encerrar conexões:', error);
    process.exit(1);
  }
});

// Tratamento de exceções não capturadas
process.on('uncaughtException', (error) => {
  logger.error('Exceção não capturada:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promessa rejeitada não tratada:', reason);
  // Não encerramos o processo aqui para permitir recuperação
});