# WhatsApp Service - HubEscolar

Microserviço responsável pela integração do WhatsApp com o sistema HubEscolar, utilizando Venom-bot.

## 🚀 Funcionalidades

- Envio e recebimento de mensagens via WhatsApp
- Gestão de sessões WhatsApp
- Integração com banco de dados PostgreSQL
- API RESTful para comunicação com outros serviços

## 📋 Pré-requisitos

- Node.js >= 12
- PostgreSQL
- NPM ou Yarn

## 🔧 Instalação

1. Clone o repositório
```bash
git clone <repository-url>
cd whatsapp-service
```

2. Instale as dependências
```bash
npm install
```

3. Configure as variáveis de ambiente
```bash
cp .env.example .env
```

4. Inicie o serviço
```bash
npm run dev
```

## 🛠️ Tecnologias

- [Node.js](https://nodejs.org/)
- [Express](https://expressjs.com/)
- [Venom-bot](https://github.com/orkestral/venom)
- [Sequelize](https://sequelize.org/)
- [PostgreSQL](https://www.postgresql.org/)
- [Winston](https://github.com/winstonjs/winston)

## 📦 Estrutura do Projeto

```
whatsapp-service/
├── src/
│   ├── config/        # Configurações
│   ├── controllers/   # Controladores
│   ├── middlewares/   # Middlewares
│   ├── models/        # Modelos
│   ├── routes/        # Rotas
│   ├── services/      # Serviços
│   └── utils/         # Utilitários
```

## 🔍 Scripts

- `npm start`: Inicia o serviço em produção
- `npm run dev`: Inicia o serviço em desenvolvimento com hot-reload
- `npm run debug`: Inicia o serviço em modo debug
- `npm test`: Executa os testes

## 📄 API Endpoints

- `POST /messages/send`: Envia uma mensagem
- `GET /messages`: Lista mensagens
- `GET /status`: Status do serviço

## 👥 Autor

Felipe Guasti

## 📝 Licença

ISC



## 2. Desenvolvimento por Camadas

### Camada 1: Configuração
1. **config/database.js** - Configuração do Sequelize
2. **config/whatsapp.js** - Configuração do Venom-bot
3. **utils/logger.js** - Configuração do Winston

### Camada 2: Core
1. **services/whatsappService.js** - Serviço principal do WhatsApp
2. **models/Message.js** - Modelo de dados

### Camada 3: Controllers e Routes
1. **controllers/messageController.js** - Controladores
2. **routes/messageRoutes.js** - Rotas da API

### Camada 4: Middlewares
1. **middlewares/auth.js** - Autenticação
2. **middlewares/error.js** - Tratamento de erros
3. **middlewares/validation.js** - Validações

### Camada 5: App Principal
1. **app-whatsapp-service.js** - Arquivo principal

## Sugestão de Ordem de Desenvolvimento:

1. Começar pela configuração básica (logger.js e database.js)
2. Implementar a integração com Venom-bot (whatsapp.js)
3. Desenvolver o serviço principal (whatsappService.js)
4. Criar as rotas e controllers
5. Implementar middlewares
6. Finalizar com o arquivo principal

Quer que comecemos pela implementação do logger.js para ter um sistema de logs adequado desde o início?