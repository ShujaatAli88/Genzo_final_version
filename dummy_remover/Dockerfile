# Use a Python base image
FROM python:3.9-slim

# Set the working directory
WORKDIR /app

# Install git and other necessary build dependencies
RUN apt-get update && apt-get install -y \
    git \
    && rm -rf /var/lib/apt/lists/*

# Configure git to handle large repositories better
# RUN git config --global url."https://".insteadOf git://
RUN git config --global http.postBuffer 524288000
RUN git config --global core.compression 0

# Copy requirements.txt (assuming it exists in the same directory as your Dockerfile)
COPY requirements.txt /app/

# Install dependencies
RUN pip install --upgrade pip
RUN pip install virtualenv
RUN virtualenv venv  # Create the virtual environment
# Clone segment-anything separately with retry logic
RUN git clone --depth 1 https://github.com/facebookresearch/segment-anything.git /tmp/segment-anything || \
    git clone --depth 1 https://github.com/facebookresearch/segment-anything.git /tmp/segment-anything || \
    git clone --depth 1 https://github.com/facebookresearch/segment-anything.git /tmp/segment-anything
RUN git clone --depth 1 https://github.com/facebookresearch/segment-anything.git /tmp/segment-anything \
    && cd /tmp/segment-anything \
    && pip install -e .

RUN . venv/bin/activate && \
    # Remove segment-anything from requirements if present
    grep -v "segment-anything" requirements.txt > temp_requirements.txt && \
    pip install -r temp_requirements.txt
# RUN . venv/bin/activate 
# RUN pip install -r requirements.txt  # Install dependencies inside the virtual environment

# Copy the rest of the Flask application
COPY . /app/

# Expose the port that Flask runs on (default: 5000)
EXPOSE 5000

# Command to run Flask API (replace with your app's entry point)
CMD ["python", "dummyRemovalApi.py"]
