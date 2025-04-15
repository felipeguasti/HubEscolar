# report-service

Este é um microserviço Node.js Express para gerar relatórios elaborados sobre alunos, com base em tópicos fornecidos e levando em consideração leis relevantes para defender a escola. Ele se comunica com o `users-service` para obter informações de coordenadores e alunos e utiliza uma inteligência artificial (IA) para construir o texto do relatório.

## Estrutura do Projeto

report-service/
├── app-report-service.js    // Arquivo principal do microserviço
├── .env                     // Arquivo de variáveis de ambiente
├── src/
│   ├── routes/              // Definição das rotas da API
│   │   └── reportRoutes.js
│   ├── controllers/         // Lógica de controle das requisições
│   │   └── reportController.js
│   ├── middleware/          // Middlewares para as requisições
│   │   └── auth.js          // Middleware de autenticação
│   ├── service/             // Lógica de comunicação com outros serviços (users-service) e IA
│   │   ├── userService.js
│   │   └── aiService.js
│   ├── config/              // Arquivos de configuração
│   │   └── db.js            // Configuração do banco de dados (se necessário)
│   ├── models/              // Definição de modelos de dados (se necessário)
│   │   └── Report.js  // Exemplo de modelo para relatório (se persistir dados)


## Pré-requisitos

* Node.js (versão >= 18)
* npm ou yarn instalado

## Configuração

1.  Clone este repositório.
2.  Crie um arquivo `.env` na raiz do projeto e configure as seguintes variáveis de ambiente:

    ```
    PORT=3002
    USERS_SERVICE_URL=http://localhost:3001
    AI_API_URL=SUA_URL_DA_API_DE_IA
    AI_API_KEY=SUA_CHAVE_DA_API_DE_IA
    JWT_SECRET=SEU_SEGREDO_JWT
    # Outras variáveis de ambiente conforme necessário
    ```

## Instalação

```bash
npm install
# ou
yarn install
Execução
Bash

npm run start
# ou
yarn start
O microserviço estará rodando na porta configurada no arquivo .env (padrão: 3002).

Endpoints da API
POST /reports/create
Descrição: Cria um novo relatório sobre um aluno com base nos tópicos fornecidos. Requer autenticação.

Requisição:

JSON

{
  "coordinatorId": "id_do_coordenador",
  "studentId": "id_do_aluno",
  "topics": ["tópico 1", "tópico 2", "tópico 3"]
}
Headers:

Authorization: Bearer <token>
Content-Type: application/json
Resposta (Sucesso - 200 OK):

JSON

{
  "report": "Texto bem elaborado do relatório gerado pela IA..."
}
Respostas de Erro (Exemplos):

JSON

{ "error": "Dados inválidos para criar o relatório." } // 400 Bad Request
JSON

{ "error": "Não autorizado." } // 401 Unauthorized
JSON

{ "error": "Coordenador não autorizado." } // 403 Forbidden
JSON

{ "error": "Aluno não encontrado." } // 404 Not Found
JSON

{ "error": "Erro interno do servidor." } // 500 Internal Server Error
Middleware de Autenticação
O middleware auth.js é responsável por validar a autenticação do usuário que está criando o relatório. Atualmente, assume-se a utilização de tokens JWT para essa finalidade. Ele verifica a presença e a validade do token no header da requisição.

Serviços
userService.js: Comunica-se com o users-service (na URL definida em USERS_SERVICE_URL) para obter informações de coordenadores e alunos.
aiService.js: Interage com uma API de inteligência artificial para gerar o texto do relatório com base nos tópicos fornecidos e nas leis relevantes. A URL e a chave de API são configuradas nas variáveis de ambiente AI_API_URL e AI_API_KEY.
Considerações sobre a IA
A qualidade do relatório gerado pela IA dependerá da clareza dos tópicos fornecidos e da capacidade da IA de interpretar as leis relevantes para defender a escola. É importante definir claramente no aiService.js como o prompt para a IA é construído e quais leis devem ser consideradas.

(Opcional) Persistência de Dados
Se houver a necessidade de armazenar os relatórios gerados, a pasta config e models contêm arquivos para configuração do banco de dados e definição de modelos, respectivamente. A implementação da persistência precisará ser feita nos controllers e models.

Contribuição
Contribuições são bem-vindas! Sinta-se à vontade para abrir issues e enviar pull requests.

Licença
[Sua Licença Aqui]