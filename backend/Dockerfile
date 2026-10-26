FROM python:3.11-slim

WORKDIR /app

# Copiar requirements primero para aprovechar caché de Docker
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copiar el resto del código
COPY . .

RUN chmod +x start.sh

CMD ["sh", "start.sh"]
