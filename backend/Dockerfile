FROM python:3.11-slim

WORKDIR /app

# Instalar dependencias del sistema (solo lo necesario para psycopg2)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copiar requirements primero para aprovechar caché de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

RUN chmod +x start.sh

CMD ["sh", "start.sh"]
