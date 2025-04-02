# Usa a imagem base do Node.js
FROM node:18

# Define o diretório de trabalho
WORKDIR /app

# Copia os arquivos package.json e package-lock.json
COPY package*.json ./

# Instala as dependências
RUN npm install

# Copia o restante dos arquivos do aplicativo
COPY . .

# Expõe a porta em que o aplicativo será executado
EXPOSE 3000

# Comando para iniciar o aplicativo
CMD ["node", "app"]