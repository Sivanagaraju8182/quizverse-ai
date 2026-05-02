# QuizVerse AI

QuizVerse AI is a full-stack AI-powered quiz generation platform that creates multiple-choice questions dynamically from user input, voice input, or uploaded documents such as PDFs. The system analyzes the provided content and generates structured quizzes in real time.
---
## Overview
This application enables users to generate quizzes based on:
nput (topic-based)
* Voice input (speech-to-text)
* Document upload (PDF/text analysis)
It supports dynamic quiz flow with real-time evaluation, scoring, and history tracking.
---
## Key Features
* AI-generated multiple-choice questions using OpenRouter API
* Topic-based quiz generation (e.g., Java, Python, Data Structures)
* Voice input support for hands-free topic entry
* PDF and document upload with content-based quiz generation
* Difficulty levels (Easy, Medium, Hard)
* One-question-at-a-time quiz flow
* Automatic progression after answering
* 60-second timer per question
* Stop quiz functionality at any point
* Instant feedback with correct and incorrect answer highlighting
* Result summary with score, attempted questions, and percentage
* MongoDB integration for storing quiz history
* Fully responsive UI with modern glassmorphism design
---
## Technology Stack
### Frontend
* React (Vite)
* Tailwind CSS
* JavaScript
### Backend
* FastAPI (Python)
* OpenRouter API (LLM integration)
### Database
* MongoDB Atlas
* PyMongo
---

## Project Structure
quizverse-ai/
│
├── backend/
│   ├── main.py
│   ├── database.py
│   ├── .env
│   └── requirements.txt
│
├── src/
│   ├── App.jsx
│   ├── index.css
│   └── components/
│
├── public/
├── index.html
└── package.json
```
## Installation and Setup
### Clone Repository
git clone https://github.com/your-username/quizverse-ai.git
cd quizverse-ai
---
### Backend Setup
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```
Create a `.env` file in the backend folder:
OPENROUTER_API_KEY=your_api_key
MONGO_URL=your_mongodb_connection_string
```
Run backend server:
uvicorn main:app --reload
```
### Frontend Setup
npm install
npm run dev

## API Endpoints
Generate Quiz
POST /generate-quiz

Save Result
POST /save-result

Get History
GET /history

## Example Response
{
  "question": "What is Python?",
  "options": ["Language", "Snake", "Game", "Operating System"],
  "correct": "Language"
}
```
### Future Enhancement
* Voice-based quiz answering
* Leaderboard and ranking system
* Multi-user authentication system
* Advanced analytics dashboard
* Deployment with CI/CD pipeline
---
## Environment Variables
OPENROUTER_API_KEY=your_key
MONGO_URL=your_connection_string
```
## Author
Adipudi Sivanagaraju
B.Tech Graduate seeking opportunities in Full Stack Development
---
## License
This project is open-source and available under the MIT License.
