# 🚀 Genzo_final_version

![Electron](https://img.shields.io/badge/Electron-2C2E3B?logo=electron&logoColor=white)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)
![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white)
![Flask](https://img.shields.io/badge/Flask-000000?logo=flask&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white)

---

Genzo_final_version is a full-stack application for advanced image processing, including dummy and human removal. It combines a modern Electron-based desktop frontend, robust Node.js/Flask backend services, and powerful Python image processing, all backed by MongoDB.

---

## 🛠️ Tech Stack

- **Frontend:**  
  ![Electron](https://img.shields.io/badge/Electron-2C2E3B?logo=electron&logoColor=white) Electron, ![HTML5](https://img.shields.io/badge/HTML5-E34F26?logo=html5&logoColor=white) HTML, ![CSS3](https://img.shields.io/badge/CSS3-1572B6?logo=css3&logoColor=white) CSS, ![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

- **Backend:**  
  ![Node.js](https://img.shields.io/badge/Node.js-339933?logo=node.js&logoColor=white) Node.js (Express), ![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white) Flask (Python)

- **Image Processing:**  
  ![Python](https://img.shields.io/badge/Python-3776AB?logo=python&logoColor=white) Python

- **Database:**  
  ![MongoDB](https://img.shields.io/badge/MongoDB-47A248?logo=mongodb&logoColor=white) MongoDB

## 📁 Project Structure

```
.
├── backend/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── services/
│   ├── server.js
│   ├── package.json
│   ├── requirements.txt
│   └── Dockerfile
├── dummy_remover/
│   ├── dummyRemovalApi.py
│   ├── dummyRemover.py
│   ├── requirements.txt
│   └── Dockerfile
├── Frontend/
│   ├── *.html
│   ├── main.js
│   ├── style.css
│   ├── package.json
│   └── ...
├── README.md
├── render.yaml
└── .gitignore
```

## Components

### 1. Backend

- **Location:** [`backend/`](backend/)
- **Description:** Node.js/Express server handling API requests, authentication, and business logic.
- **Key Files:**
  - [`server.js`](backend/server.js): Entry point for the backend server.
  - [`controllers/`](backend/controllers/): Route controllers.
  - [`middleware/`](backend/middleware/): Express middleware.
  - [`models/`](backend/models/): Data models.
  - [`services/`](backend/services/): Service logic.
  - [`package.json`](backend/package.json): Backend dependencies.
  - [`requirements.txt`](backend/requirements.txt): Python dependencies (if any).

### 2. Dummy Remover

- **Location:** [`dummy_remover/`](dummy_remover/)
- **Description:** Python microservice for image processing (dummy removal).
- **Key Files:**
  - [`dummyRemovalApi.py`](dummy_remover/dummyRemovalApi.py): API for dummy removal.
  - [`dummyRemover.py`](dummy_remover/dummyRemover.py): Core dummy removal logic.
  - [`requirements.txt`](dummy_remover/requirements.txt): Python dependencies.

### 3. Frontend

- **Location:** [`Frontend/`](Frontend/)
- **Description:** User interface built with HTML, CSS, and JavaScript.
- **Key Files:**
  - HTML pages: [`dashboard.html`](Frontend/dashboard.html), [`login.html`](Frontend/login.html), etc.
  - [`main.js`](Frontend/main.js): Main JavaScript logic.
  - [`style.css`](Frontend/style.css): Stylesheet.
  - [`package.json`](Frontend/package.json): Frontend dependencies.

## 🚀 Setup & Installation

### Prerequisites

- Node.js & npm
- Python 3.x & pip
- Docker (optional, for containerized deployment)

### Backend

```sh
cd backend
npm install
node server.js
```

### Dummy Remover

```sh
cd dummy_remover
pip install -r requirements.txt
python dummyRemovalApi.py
```

### Frontend

Open `Frontend/index.html` or `Frontend/dashboard.html` in your browser, or serve with a static server.

## Deployment

You can use Docker for each service:

```sh
# Backend
cd backend
docker build -t genzo-backend .

# Dummy Remover
cd dummy_remover
docker build -t genzo-dummy-remover .
```

## Configuration

- See [`render.yaml`](render.yaml) for deployment configuration.
- Environment variables and secrets should be managed securely.

## License

[Specify your license here]

---

*For more details, see the individual README files in each subdirectory.*