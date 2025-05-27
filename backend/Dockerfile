
# Use a Node.js base image
FROM node:16

# Set the working directory
WORKDIR /app

# Copy package files (no need for backend/ prefix since context is already ./backend)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install


# FROM python:3.9-slim
# Install system dependencies
RUN apt-get update && apt-get install -y \
    git \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    && rm -rf /var/lib/apt/lists/*


# If you really need Python (only keep this if you're running Python scripts from Node.js)
RUN apt-get update && apt-get install -y --fix-missing python3-pip
# RUN apt-get install -y --fix-missing python3-pip
RUN pip3 install virtualenv
COPY requirements.txt ./  
RUN virtualenv venv
# Modify requirements.txt to remove duplicate PyYAML
# RUN sed -i '/PyYAML/d' requirements.txt && echo "PyYAML==6.0.2" >> requirements.txt
RUN . venv/bin/activate && pip install -r requirements.txt

# Copy the rest of the application
COPY . .

# Expose the port
EXPOSE 3000

# Command to run Node.js API
CMD ["node", "server.js"]