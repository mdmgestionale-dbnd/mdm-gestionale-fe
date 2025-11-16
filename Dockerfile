FROM node:20-alpine
WORKDIR /app

# Variabili di build-time
ARG NEXT_PUBLIC_BACKEND_URL
ARG JWT_SECRET

# Inietto le variabili come environment build-time
ENV NEXT_PUBLIC_BACKEND_URL=${NEXT_PUBLIC_BACKEND_URL}
ENV JWT_SECRET=${JWT_SECRET}

# Copia package.json prima per caching
COPY package.json package-lock.json ./

RUN npm cache clean --force
RUN npm ci

# Copia tutto il codice
COPY . .

# Build con le variabili iniettate
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
