# Microserviço de Usuários

Este documento fornece informações sobre o microserviço de usuários (`users-service`), incluindo sua finalidade, arquitetura, configuração, endpoints da API e como executar o serviço em diferentes ambientes (desenvolvimento e Docker).

## 1. Finalidade

O microserviço de usuários é responsável por gerenciar as informações dos usuários dentro da aplicação HubEscolar. Suas principais funcionalidades incluem:

* Criação, leitura, atualização e exclusão (CRUD) de usuários.
* Autenticação e autorização de usuários (em conjunto com o `auth-service`).
* Gerenciamento de dados específicos dos usuários, como informações de contato, endereço, perfil e classe de usuário.
* Filtragem e busca de usuários com base em diferentes critérios.
* Reset de senha de usuários.

## 2. Arquitetura

O `users-service` é construído utilizando Node.js e o framework Express.js. Ele segue uma arquitetura de microsserviços, comunicando-se com outros serviços da aplicação (como `main-service`, `school-service` e `district-service`) através de chamadas HTTP.

* **Linguagem:** JavaScript (Node.js)
* **Framework:** Express.js
* **Banco de Dados:** Configurado via Sequelize (a tecnologia específica do banco de dados é definida nas variáveis de ambiente).
* **Autenticação:** Baseada em tokens JWT (verificados através do middleware `authenticate.js` que valida tokens emitidos pelo `auth-service`).
* **Cache:** Implementado para o usuário logado utilizando um middleware (`cacheUserMiddleware`) que armazena informações em memória (Map) com expiração.
* **Validação:** Utiliza `express-validator` para validar os dados de entrada nas requisições.
* **Logs:** Utiliza a biblioteca `winston` para geração de logs, com configuração definida pelas variáveis de ambiente (`LOG_LEVEL`, `LOG_DIR`).
* **Configuração:** As configurações do serviço são gerenciadas através de variáveis de ambiente (utilizando o pacote `dotenv` para carregar do arquivo `.env` em ambientes de desenvolvimento).

## 3. Configuração

O serviço utiliza variáveis de ambiente para sua configuração. As seguintes variáveis são relevantes:

* `USERS_SERVICE_PORT`: A porta em que o serviço irá escutar (padrão: 3001).
* `JWT_SECRET`: A chave secreta usada para verificar a assinatura dos tokens JWT (deve ser a mesma do `auth-service`).
* `MYSQL_HOST`, `MYSQL_USER`, `MYSQL_PASSWORD`, `MYSQL_DATABASE`: Informações de conexão com o banco de dados MySQL.
* `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_DIALECT`: Informações de conexão com o banco de dados (utilizadas pelo Sequelize).
* `SCHOOL_SERVICE_URL`: URL base do microserviço de escolas.
* `DISTRICT_SERVICE_URL`: URL base do microserviço de distritos.
* `MAIN_SERVICE_URL`: URL base do microserviço principal.
* `LOG_LEVEL`: Nível de log a ser utilizado (e.g., `info`, `debug`, `error`).
* `LOG_DIR`: Diretório onde os arquivos de log serão armazenados.
* `CACHE_EXPIRATION`: Tempo em segundos para expiração do cache de usuários.
* `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`: Informações de conexão com o Redis (se utilizado para cache em outros cenários).

Essas variáveis podem ser configuradas em um arquivo `.env` na raiz do projeto para desenvolvimento local ou através de variáveis de ambiente no ambiente Docker.

## 4. Endpoints da API

A API do microserviço de usuários oferece os seguintes endpoints sob o prefixo `/users`:

* `POST /users`: Cria um novo usuário (requer autenticação).
* `GET /users`: Lista todos os usuários (requer autenticação).
* `GET /users/:id`: Busca um usuário específico pelo ID (requer autenticação).
* `PUT /users/:id`: Atualiza um usuário existente pelo ID (requer autenticação).
* `DELETE /users/:id`: Deleta um usuário existente pelo ID (requer autenticação).
* `GET /users/me`: Busca as informações do usuário logado (requer autenticação).
* `GET /filter`: Lista usuários com base em filtros na query (requer autenticação).
* `POST /users/reset-password`: Reseta a senha de um usuário (requer autenticação).
* `GET /users/data`: Obtém dados específicos dos usuários (requer autenticação).

Cada endpoint pode requerer autenticação e autorização, dependendo da sua finalidade e das políticas de segurança da aplicação. A autenticação é feita através do envio de um token JWT no header `Authorization`.

## 5. Execução

### 5.1. Desenvolvimento Local

1.  **Pré-requisitos:** Node.js e npm (ou yarn) instalados. Um banco de dados MySQL em execução (configurado nas variáveis de ambiente).
2.  **Instalar Dependências:** Navegue até a raiz do diretório do `users-service` no terminal e execute:
    ```bash
    npm install
    ```
3.  **Configurar Variáveis de Ambiente:** Crie um arquivo `.env` na raiz do projeto e configure as variáveis de ambiente necessárias (copiando e ajustando do `.env` de exemplo, se houver).
4.  **Iniciar o Serviço:** Execute o seguinte comando no terminal:
    ```bash
    npm start
    ```
    O serviço estará disponível em `http://localhost:3001` (ou na porta configurada em `USERS_SERVICE_PORT`).

### 5.2. Docker

1.  **Pré-requisitos:** Docker e Docker Compose instalados.
2.  **Configurar Docker Compose:** Certifique-se de que o serviço `users-service` esteja corretamente configurado no seu arquivo `docker-compose.yml` (conforme a configuração fornecida anteriormente).
3.  **Construir e Iniciar os Contêineres:** Navegue até o diretório raiz do seu projeto (onde o `docker-compose.yml` está localizado) e execute:
    ```bash
    docker-compose up --build users-service
    ```
    ou para iniciar todos os serviços:
    ```bash
    docker-compose up --build
    ```
    O serviço `users-service` estará acessível na porta 3001 da sua máquina host (mapeada para a porta 3001 dentro do container). As variáveis de ambiente para o container podem ser definidas no `docker-compose.yml` na seção `environment` do serviço `users-service`.

## 6. Estrutura de Pastas

users-service/
├── app-users-service.js     (Arquivo principal do servidor)
├── package.json
├── package-lock.json
├── .env                     (Arquivo de variáveis de ambiente)
├── src/
│   ├── controllers/
│   │   └── usersController.js
│   ├── models/
│   │   └── User.js
│   ├── services/
│   │   ├── userService.js
│   │   ├── permissionService.js
│   │   └── logService.js
├── routes/
│   └── users.js
├── middlewares/
│   ├── authenticate.js
│   └── cacheUser.js
├── config/
│   └── db.js                (Configuração do banco de dados Sequelize)
└── logs/                    (Diretório para arquivos de log)

## 7. Próximos Passos e Considerações Futuras

* Implementação de testes unitários e de integração.
* Refinamento da lógica de autorização com base em roles e permissões específicas.
* Considerar a utilização de um cache distribuído (como Redis) para o cache de usuários em um ambiente com múltiplas instâncias do serviço.
* Implementação de mecanismos de tratamento de erros mais robustos e centralizados.
* Monitoramento e logging da aplicação em ambientes de produção.