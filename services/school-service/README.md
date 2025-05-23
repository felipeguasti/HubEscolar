# Microserviço de Escolas

Este repositório contém o código para o microserviço de Escolas, responsável por gerenciar informações sobre escolas dentro do sistema.

## Visão Geral

O microserviço de Escolas permite a criação, leitura, atualização e exclusão de registros de escolas. Ele se comunica com outros microserviços (como o de Distritos) para obter informações relacionadas e segue princípios de segurança e boas práticas de desenvolvimento.

## Funcionalidades Principais

* **CRUD de Escolas:** Permite criar, listar, visualizar detalhes, atualizar e excluir informações de escolas.
* **Validação de Dados:** Garante que os dados de entrada estejam corretos e consistentes antes de serem processados.
* **Comunicação com o Serviço de Distritos:** Interage com o microserviço de Distritos para validar a existência dos distritos associados às escolas.
* **Autenticação e Autorização:** Protege as operações através da verificação de tokens JWT e da autorização baseada em roles de usuário (Master e Inspetor têm permissões para operações de escrita).
* **Logging:** Registra informações importantes sobre o funcionamento do serviço, incluindo logs de requisição HTTP, erros e eventos de segurança.
* **Segurança:** Implementa medidas de segurança como headers HTTP (com `helmet`), rate limiting (com `express-rate-limit`) e proteção contra payloads excessivamente grandes.
* **Tratamento de Erros:** Fornece respostas de erro consistentes e informativas.

## Tecnologias Utilizadas

* **Node.js:** Ambiente de execução JavaScript do lado do servidor.
* **Express:** Framework web minimalista e flexível para Node.js.
* **Sequelize:** ORM (Object-Relational Mapping) para Node.js, utilizado para interagir com o banco de dados.
* **MySQL (ou outro banco de dados configurado):** Banco de dados relacional para armazenar os dados das escolas.
* **dotenv:** Para carregar variáveis de ambiente a partir de um arquivo `.env`.
* **jsonwebtoken:** Para verificar tokens JWT enviados para autenticação.
* **express-validator:** Para validação dos dados de requisição.
* **axios:** Cliente HTTP para fazer requisições a outros microserviços.
* **winston:** Biblioteca de logging para Node.js.
* **morgan:** Middleware de logging HTTP para Express.
* **helmet:** Middleware para configurar headers HTTP de segurança.
* **express-rate-limit:** Middleware para limitar a taxa de requisições.

## Pré-requisitos

* **Node.js e npm (ou yarn) instalados:** Certifique-se de ter o Node.js e o gerenciador de pacotes npm (ou yarn) instalados em sua máquina.
* **Acesso a um banco de dados MySQL (ou outro configurado):** O serviço requer um banco de dados para persistir os dados das escolas. As configurações de conexão devem estar definidas nas variáveis de ambiente.
* **Variáveis de ambiente configuradas:** Um arquivo `.env` na raiz do projeto deve conter as configurações necessárias, como a URL do serviço de Distritos (`DISTRICT_SERVICE_URL`), informações de conexão com o banco de dados, porta do serviço (`SCHOOL_SERVICE_PORT`), etc.
* **Microserviço de Autenticação (Auth Service) rodando:** Para autenticação e autorização, o serviço espera receber tokens JWT gerados por um serviço de autenticação.
* **Microserviço de Distritos (District Service) rodando:** O serviço se comunica com o serviço de Distritos para validar a existência dos distritos.

## Configuração e Execução

1.  **Clone o repositório:**
    ```bash
    git clone <URL_DO_REPOSITORIO>
    cd <NOME_DO_REPOSITORIO>
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    # ou
    yarn install
    ```

3.  **Configure as variáveis de ambiente:**
    * Crie um arquivo `.env` na raiz do projeto.
    * Adicione as variáveis de ambiente necessárias (veja o arquivo `.env.example` se disponível ou as seções de "Pré-requisitos" e "Configuração do Banco de Dados" abaixo).

4.  **Configure o banco de dados:**
    * Certifique-se de que as informações de conexão com o banco de dados (host, nome do banco, usuário, senha) estejam corretamente configuradas no seu arquivo `.env`.
    * Execute as migrações do Sequelize (se houver) para criar as tabelas no banco de dados. Exemplo (se configurado):
        ```bash
        npx sequelize-cli db:migrate
        ```

5.  **Execute o microserviço:**
    ```bash
    npm start
    # ou
    yarn start
    ```

    O serviço estará rodando na porta especificada na variável de ambiente `SCHOOL_SERVICE_PORT` (ou na porta padrão 3002 se a variável não estiver definida).

## Rotas da API

As rotas da API do microserviço de Escolas estão prefixadas com `/schools`.

* **`POST /schools`:** Cria uma nova escola. Requer autenticação (Master ou Inspetor).
    * Corpo da requisição (JSON): `{ name, districtId, address?, city?, state?, cep?, telephone?, status }`
* **`GET /schools`:** Lista todas as escolas ou filtra por `districtId` (query parameter opcional).
* **`GET /schools/:id`:** Obtém os detalhes de uma escola específica pelo ID.
* **`PUT /schools/:id`:** Atualiza as informações de uma escola específica pelo ID. Requer autenticação (Master ou Inspetor).
    * Corpo da requisição (JSON): `{ name?, districtId?, address?, city?, state?, cep?, telephone?, status? }`
* **`DELETE /schools/:id`:** Exclui uma escola específica pelo ID. Requer autenticação (Master ou Inspetor).

## Segurança

Este microserviço implementa as seguintes medidas de segurança:

* **Autenticação Baseada em Token JWT:** As rotas que modificam dados requerem um token JWT válido no header de autorização (`Authorization: Bearer <token>`).
* **Autorização Baseada em Roles:** O acesso a certas funcionalidades (criação, atualização, exclusão) é restrito a usuários com as roles "Master" ou "Inspetor".
* **Headers de Segurança HTTP (com `helmet`):** Configuração de headers como `Content-Security-Policy`, `X-Frame-Options`, `X-Content-Type-Options`, etc., para proteger contra ataques comuns.
* **Rate Limiting (com `express-rate-limit`):** Limita o número de requisições por endereço IP para proteger contra ataques de força bruta e negação de serviço.
* **Limites de Tamanho de Requisição:** Limita o tamanho do corpo das requisições para evitar o consumo excessivo de recursos.
* **Timeouts em Requisições Externas:** Configura timeouts para as chamadas ao serviço de Distritos para evitar esperas indefinidas.
* **Validação e Sanitização de Dados:** Utiliza `express-validator` para garantir a integridade dos dados de entrada.
* **Logging de Segurança:** Registra tentativas de acesso não autorizado e outras atividades relevantes para segurança.

## Logging

O serviço utiliza `winston` para logging, com logs sendo gravados no console e em arquivos (`logs/error.log` para erros e `logs/combined.log` para todos os logs). O `morgan` é utilizado para logging das requisições HTTP.

## Próximos Passos e Melhorias

* Implementar testes unitários e de integração para garantir a qualidade e a segurança do código.
* Considerar a implementação de um sistema de cache para melhorar o desempenho.
* Explorar opções de observabilidade mais avançadas (monitoramento, tracing).
* Implementar um sistema de health checks para monitorar a saúde do serviço.
* Refinar a política de rate limiting para rotas específicas.
* Implementar a comunicação segura (HTTPS) entre todos os microserviços, especialmente em ambientes de produção.
* Considerar a implementação de um serviço de gerenciamento de segredos mais robusto para ambientes de produção.

## Contribuição

Contribuições são bem-vindas! Por favor, siga as diretrizes de contribuição (se houver) ou entre em contato com os responsáveis pelo projeto para discutir suas ideias.
