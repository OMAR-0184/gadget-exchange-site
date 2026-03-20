# Use official lightweight Python image
FROM python:3.11-slim

# Set the working directory
WORKDIR /app

# Install system dependencies if required for cryptography/asyncpg
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*

# Copy python dependencies
COPY requirements.txt .

# Install python dependencies from requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy the server directory contents to /app/server
# The context will be the parent directory when building, but let's assume we build from /server
COPY . /app/server

# Expose port 8000
EXPOSE 8000

# Set Python path so `server.main` is recognized
ENV PYTHONPATH=/app

# Run the Uvicorn application from the /app directory
CMD ["uvicorn", "server.main:app", "--host", "0.0.0.0", "--port", "8000"]
