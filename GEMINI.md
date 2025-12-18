# GEMINI.md

## Project Overview

**Project Name:** 鸡王争霸赛 (Chicken King Contest) - ikuncode
**Description:** A full-stack web application platform for the "Chicken King" developer contest. Features include Linux.do OAuth login, contest registration, project submission, voting systems, and leaderboards.

### Tech Stack

**Frontend:**
*   **Framework:** React 18 + Vite
*   **Styling:** Tailwind CSS
*   **State Management:** Zustand
*   **Routing:** React Router
*   **Networking:** Axios + React Query

**Backend:**
*   **Framework:** FastAPI
*   **ORM:** SQLAlchemy (Async with aiomysql)
*   **Database:** MySQL 8.0
*   **Caching:** Redis
*   **Authentication:** JWT, OAuth (Linux.do)

**Infrastructure:**
*   **Containerization:** Docker, Docker Compose

## Architecture & Key Workflows

### Directory Structure
*   `frontend/`: React application source code.
    *   `src/stores/`: Zustand state management (auth, registration, theme).
    *   `src/services/`: API integration.
*   `backend/`: FastAPI application source code.
    *   `app/api/v1/endpoints/`: API route handlers (auth, contest, registration, etc.).
    *   `app/core/`: Core configuration and database connection.
    *   `app/models/`: SQLAlchemy database models.
    *   `app/schemas/`: Pydantic data schemas.
*   `sql/`: Database initialization scripts.

### Authentication Flow (Linux.do OAuth)
1.  Frontend initiates OAuth at `/api/v1/auth/linuxdo/login`.
2.  Callback handled at `/api/v1/auth/linuxdo/callback`.
3.  Backend issues JWT and redirects to frontend with token (`/login#token=xxx`).
4.  Frontend parses hash and stores token in `authStore`.

## Setup & Development Commands

### Prerequisites
*   Node.js & npm
*   Python 3.x
*   MySQL 8.0
*   Redis

### Database Initialization
Initialize the database schema:
```bash
mysql -u root -proot -P 3306 < backend/sql/schema.sql
```

### Frontend Development
Navigate to `frontend/`:
```bash
npm install
npm run dev          # Start dev server: http://localhost:5173
npm run build        # Build for production
```

### Backend Development
Navigate to `backend/`:
```bash
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload  # Start server: http://localhost:8000
```

### Testing
From `backend/`:
```bash
pytest                  # Run all tests
pytest -v tests/test_xxx.py  # Run specific test file
```

### Docker
Run the full stack:
```bash
docker-compose up -d
docker-compose logs -f
```

## Configuration

**Backend (`backend/.env`):**
```env
DATABASE_URL=mysql+aiomysql://root:root@localhost:3306/chicken_king
SECRET_KEY=your-secret-key
LINUX_DO_CLIENT_ID=xxx
LINUX_DO_CLIENT_SECRET=xxx
```

**Frontend (`frontend/.env`):**
```env
VITE_API_URL=http://localhost:8000/api/v1
```

## Development Conventions

*   **Naming:**
    *   Frontend Components: PascalCase (e.g., `RegistrationModal.jsx`)
    *   API Routes/Variables: snake_case (e.g., `user_id`, `/api/v1/auth`)
*   **Commits:** Follow **Conventional Commits** standard (e.g., `feat: add login`, `fix: resolve auth bug`).
*   **Backend Pattern:** Use dependency injection for DB sessions and current user retrieval.
