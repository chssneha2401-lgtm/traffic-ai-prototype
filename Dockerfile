FROM python:3.11-slim

WORKDIR /app

# Install all required Linux C++ system libraries for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libxcb1 \
    libx11-xcb1 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
RUN pip uninstall -y opencv-python || true
RUN pip install --no-cache-dir opencv-python-headless

COPY . .

CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
