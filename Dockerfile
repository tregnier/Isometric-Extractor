FROM python:3.11-slim-bookworm

RUN apt-get update && apt-get install -y --no-install-recommends \
    fonts-dejavu-core \
    libfreetype6 \
    libpng16-16 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY pyproject.toml README.md ./
COPY packages/synth-gen ./packages/synth-gen

RUN pip install --no-cache-dir -e .

VOLUME ["/data"]
WORKDIR /data

ENTRYPOINT ["synth-gen"]
CMD ["run", "--count", "5", "--output", "/data/v1"]
