# Microserviço de Autenticação

Este é um microserviço de autenticação responsável por gerenciar o login de usuários, geração de tokens de acesso (JWT) e tokens de atualização (Refresh Tokens), além de funcionalidades como logout e solicitação/redefinição de senha.

## Tecnologias Utilizadas

* **Node.js:** Ambiente de execução JavaScript do lado do servidor.
* **Express:** Framework web minimalista e flexível para Node.js.
* **jsonwebtoken (JWT):** Para geração e verificação de tokens de acesso.
* **bcrypt:** Para hash seguro de senhas.
* **express-validator:** Para validação de dados de requisição.
* **axios:** Cliente HTTP para fazer requisições a outros microserviços (como o `users-service`).
* **Sequelize:** ORM (Object-Relational Mapping) para interagir com o banco de dados MySQL.
* **MySQL:** Banco de dados relacional para persistir informações de refresh tokens.
* **uuid:** Para geração de identificadores únicos para refresh tokens.
* **express-rate-limit:** Para proteção contra ataques de força bruta (rate limiting).
* **dotenv:** Para carregar variáveis de ambiente a partir de um arquivo `.env`.
* **winston:** Para logging.

## Pré-requisitos

* **Node.js e NPM (ou Yarn) instalados:** Certifique-se de ter o Node.js e o gerenciador de pacotes NPM (ou Yarn) instalados em sua máquina.
* **Docker (opcional):** Se você utilizar Docker para o banco de dados MySQL, certifique-se de tê-lo instalado e em execução.
* **Banco de dados MySQL configurado:** Você precisará de uma instância do MySQL em execução e as credenciais de acesso configuradas.
* **Variáveis de ambiente configuradas:** Crie um arquivo `.env` na raiz do projeto e defina as variáveis de ambiente necessárias (veja a seção "Configuração").
* **`users-service` em execução:** Este microserviço depende de um `users-service` para buscar informações dos usuários. Certifique-se de que ele esteja em execução e acessível na URL configurada (`USERS_SERVICE_URL`).

## Configuração

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd auth-service
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Crie o arquivo `.env`:**
    Copie o arquivo `.env.example` (se existir) para `.env` e configure as seguintes variáveis de ambiente:

    ```env
    SESSION_SECRET=<chave_secreta_para_sessões>
    JWT_SECRET=<chave_secreta_para_assinatura_JWT>
    JWT_EXPIRATION=<tempo_de_expiração_do_access_token> (ex: 1h, 24h)
    JWT_REFRESH_EXPIRATION_TIME=<tempo_de_expiração_do_refresh_token_em_dias> (ex: 30)
    EMAIL_USER=<seu_email_para_envio_de_redefinição_de_senha>
    EMAIL_PASS=<senha_do_seu_email>
    EMAIL_HOST=<host_smtp_do_seu_email>
    EMAIL_PORT=<porta_smtp_do_seu_email>
    EMAIL_SECURE=<true_se_smtp_requerer_conexão_segura>
    DEFAULT_PASSWORD=<senha_padrão_para_novos_usuários>
    SEGES_USER=<usuário_para_integração_com_SEGES> (se aplicável)
    SEGES_PASSWORD=<senha_para_integração_com_SEGES> (se aplicável)
    MYSQL_HOST=<host_do_banco_de_dados_mysql>
    MYSQL_USER=<usuário_do_banco_de_dados_mysql>
    MYSQL_PASSWORD=<senha_do_banco_de_dados_mysql>
    MYSQL_DATABASE=<nome_do_banco_de_dados_mysql>
    MAIN_SERVICE_URL=<URL_do_seu_serviço_principal>
    USERS_SERVICE_URL=<URL_do_microserviço_de_usuários>
    SCHOOL_SERVICE_URL=<URL_do_microserviço_de_escolas> (se aplicável)
    DISTRICT_SERVICE_URL=<URL_do_microserviço_de_distritos> (se aplicável)
    AUTH_SERVICE_URL=<URL_deste_microserviço_de_autenticação>
    LOG_LEVEL=<nível_de_logging> (ex: info, debug, error)
    LOG_DIR=<diretório_para_arquivos_de_log>
    CACHE_EXPIRATION=<tempo_de_expiração_do_cache_em_segundos> (se aplicável)
    DB_HOST=${MYSQL_HOST}
    DB_PORT=3306
    DB_NAME=${MYSQL_DATABASE}
    DB_USER=${MYSQL_USER}
    DB_PASSWORD=${MYSQL_PASSWORD}
    DB_DIALECT=mysql
    REDIS_HOST=<host_do_redis> (se aplicável)
    REDIS_PORT=<porta_do_redis> (se aplicável)
    REDIS_PASSWORD=<senha_do_redis> (se aplicável)
    ```

4.  **Configurar o Sequelize CLI:**
    Este projeto utiliza o Sequelize CLI para gerenciar as migrations do banco de dados. Certifique-se de que ele esteja instalado (`npm install sequelize-cli --save-dev`). A configuração do banco de dados é feita através do arquivo `config/config.js`, que lê as variáveis de ambiente definidas no `.env`.

5.  **Executar as migrations:**
    ```bash
    npx sequelize-cli db:migrate
    ```
    Este comando criará a tabela `RefreshTokens` no seu banco de dados MySQL.

## Endpoints da API

### `POST /auth/login`

* **Descrição:** Endpoint para autenticar um usuário e obter um access token e um refresh token.
* **Corpo da Requisição (application/json):**
    ```json
    {
      "email": "[endereço de email removido]",
      "password": "senha123"
    }
    ```
* **Resposta em Caso de Sucesso (Status 200):**
    ```json
    {
      "message": "Login bem-sucedido.",
      "accessToken": "<TOKEN_DE_ACESSO_JWT>",
      "refreshToken": "<TOKEN_DE_ATUALIZACAO>"
    }
    ```
* **Resposta em Caso de Falha (Status 401):**
    ```json
    {
      "message": "Usuário ou senha inválidos."
    }
    ```
* **Resposta em Caso de Muitas Tentativas (Status 429):**
    ```json
    {
      "message": "Muitas tentativas de login. Por favor, tente novamente após 15 minutos."
    }
    ```

### `POST /auth/refresh-token`

* **Descrição:** Endpoint para obter um novo access token usando um refresh token válido.
* **Corpo da Requisição (application/json):**
    ```json
    {
      "refreshToken": "<TOKEN_DE_ATUALIZACAO_VALIDO>"
    }
    ```
* **Resposta em Caso de Sucesso (Status 200):**
    ```json
    {
      "accessToken": "<NOVO_TOKEN_DE_ACESSO_JWT>",
      "refreshToken": "<NOVO_TOKEN_DE_ATUALIZACAO>"
    }
    ```
* **Resposta em Caso de Falha (Status 401):**
    ```json
    {
      "message": "Refresh token inválido ou expirado."
    }
    ```

### `POST /auth/logout`

* **Descrição:** Endpoint para invalidar um refresh token, efetuando o logout do usuário.
* **Corpo da Requisição (application/json):**
    ```json
    {
      "refreshToken": "<TOKEN_DE_ATUALIZACAO_A_SER_INVALIDADO>"
    }
    ```
* **Resposta em Caso de Sucesso (Status 204):** (Sem conteúdo)
* **Resposta em Caso de Falha (Status 400):**
    ```json
    {
      "message": "Refresh token inválido."
    }
    ```

### `POST /auth/validate-token`

* **Descrição:** Endpoint para validar um access token existente. Requer um token válido no header de Autorização (Bearer token).
* **Headers da Requisição:**
    ```
    Authorization: Bearer <TOKEN_DE_ACESSO_JWT>
    ```
* **Resposta em Caso de Sucesso (Status 200):**
    ```json
    {
      "valid": true,
      "userId": <ID_DO_USUARIO>
    }
    ```
* **Resposta em Caso de Falha (Status 401):** (Não autorizado - token inválido ou ausente)

### `GET /auth/verify`

* **Descrição:** Endpoint similar a `/validate-token`, para verificar se o usuário está autenticado. Requer um token válido no header de Autorização (Bearer token).
* **Headers da Requisição:**
    ```
    Authorization: Bearer <TOKEN_DE_ACESSO_JWT>
    ```
* **Resposta em Caso de Sucesso (Status 200):**
    ```json
    {
      "authenticated": true,
      "userId": <ID_DO_USUARIO>
    }
    ```
* **Resposta em Caso de Falha (Status 401):** (Não autorizado - token inválido ou ausente)

### `POST /auth/request-password-reset`

* **Descrição:** Endpoint para solicitar o envio de um e-mail para redefinição de senha. Interage com o `users-service`.
* **Corpo da Requisição (application/json):**
    ```json
    {
      "email": "[endereço de email removido]"
    }
    ```
* **Resposta em Caso de Sucesso (Status 200):**
    ```json
    {
      "message": "Solicitação de redefinição de senha recebida."
    }
    ```
* **Resposta em Caso de Falha (Status 404):**
    ```json
    {
      "message": "Usuário não encontrado."
    }
    ```

### `POST /auth/reset-password/:token`

* **Descrição:** Endpoint para redefinir a senha do usuário usando um token de redefinição de senha válido. Interage com o `users-service`.
* **Parâmetro da Rota:**
    * `token`: O token de redefinição de senha enviado por e-mail.
* **Corpo da Requisição (application/json):**
    ```json
    {
      "password": "novaSenha123"
    }
    ```
* **Resposta em Caso de Sucesso (Status 200):**
    ```json
    {
      "message": "Senha redefinida com sucesso."
    }
    ```
* **Resposta em Caso de Falha (Status 400):**
    ```json
    {
      "message": "Token inválido ou expirado."
    }
    ```
* **Resposta em Caso de Falha (Status 404):**
    ```json
    {
      "message": "Usuário não encontrado."
    }
    ```

## Middlewares

* **`authMiddleware`:** Middleware para proteger rotas, verificando a validade do access token presente no header de Autorização.
* **`validationResultHandler`:** Middleware para lidar com os resultados das validações feitas com `express-validator`.
* **`loginLimiter`:** Middleware para aplicar rate limiting na rota de login, protegendo contra ataques de força bruta.

## Execução

1.  **Certifique-se de que todos os pré-requisitos estejam atendidos e as configurações estejam corretas.**
2.  **Inicie o microserviço:**
    ```bash
    npm start
    # ou
    yarn start
    ```
    O microserviço estará rodando na porta configurada (geralmente definida em suas variáveis de ambiente ou padrão do Express).

## Logging

Este microserviço utiliza a biblioteca `winston` para logging. Os logs são configurados com base na variável de ambiente `LOG_LEVEL` e são armazenados no diretório especificado pela variável `LOG_DIR`.

## Contribuição

Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e pull requests para melhorias e correções de bugs.