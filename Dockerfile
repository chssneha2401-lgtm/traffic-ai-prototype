FROM python:3.11-slim

WORKDIR /app

# Install Debian C++ OpenGL libraries for OpenCV
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglx-mesa0 \
    libglib2.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir torch torchvision --index-url https://download.pytorch.org/whl/cpu
RUN pip install --no-cache-dir -r requirements.txt
RUN pip uninstall -y opencv-python || true
RUN pip install --no-cache-dir opencv-python-headless

COPY . .

EXPOSE 8000

# Hardcoded port 8000 integer so uvicorn never fails
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
