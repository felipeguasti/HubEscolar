# Estágio de build
FROM node:18-alpine as builder

WORKDIR /app

# Copiar arquivos de dependência
COPY package*.json ./

# Instalar dependências
RUN npm install

# Copiar código fonte
COPY . .

# Estágio de produção
FROM node:18-alpine

WORKDIR /app

# Copiar dependências e código do estágio de build
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/routes ./routes
COPY --from=builder /app/controllers ./controllers
COPY --from=builder /app/services ./services
COPY --from=builder /app/middlewares ./middlewares
COPY --from=builder /app/config ./config
COPY --from=builder /app/app-users-service.js ./
COPY --from=builder /app/package*.json ./

# Criar diretório para logs
RUN mkdir -p logs

# Expor porta
EXPOSE 3001

# Comando para iniciar a aplicação
CMD ["npm", "start"] 