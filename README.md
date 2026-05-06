# YAOBOX

YAOBOX is an AI-powered web application for helping international users in China understand Chinese medicine information. The system supports medicine image upload, prescription upload, OCR extraction, AI-assisted English translation/explanation, scan history, medication reminders, profile management, and a bounded medicine assistant.

YAOBOX is not a diagnosis system and does not replace a doctor or pharmacist. OCR and AI output must be treated as assistance, not guaranteed medical truth.

## Core Features

- User registration and login with JWT authentication
- Medicine package image upload
- Prescription image upload
- Barcode-based medicine lookup flow
- OCR extraction from Chinese medicine text
- AI-assisted translation and plain-language explanation
- Structured result view with dosage, usage, warnings, extracted text, and confidence/trust indicators
- Scan history and saved medical records
- Medication reminder creation and management
- User profile/settings pages
- Medicine assistant for limited medicine-information questions

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT authentication
- OCR service using Tesseract / image-processing pipeline
- AI service using Gemini API

### Frontend

- React
- TypeScript
- Vite
- React Router
- Motion / Lucide icons
- CSS modules/global CSS according to the current frontend structure

## Repository Structure

```txt
YAOBOX/
├── backend/
│   ├── app/
│   │   ├── api/routes/       # FastAPI route modules
│   │   ├── core/             # settings, database, security helpers
│   │   ├── models/           # SQLAlchemy models
│   │   ├── schemas/          # Pydantic schemas
│   │   └── services/         # OCR, AI, scanner, medicine logic
│   ├── uploads/              # runtime uploaded files, ignored except .gitkeep
│   └── .env.example          # backend environment template
├── frontend/
│   ├── src/
│   │   ├── app/              # router, layout, route guards
│   │   ├── features/         # auth, scan, history, reminders, profile, assistant
│   │   ├── lib/              # API client/shared utilities
│   │   └── styles/           # global styling
│   ├── package.json
│   └── .env.example
├── requirements.txt
└── README.md
```

## Prerequisites

Install these before running the project:

- Python 3.10+
- Node.js 18+
- PostgreSQL 14+
- Tesseract OCR
- Git

On Windows, the Tesseract executable is commonly installed at:

```txt
C:\Program Files\Tesseract-OCR\tesseract.exe
```

## Backend Setup

From the project root:

```bash
python -m venv .venv
```

Activate the virtual environment.

Windows PowerShell:

```bash
.venv\Scripts\Activate.ps1
```

Windows CMD:

```bash
.venv\Scripts\activate.bat
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Create the backend environment file:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` with real local values:

```env
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/yaobox
SECRET_KEY=replace_with_a_long_random_secret_key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
GEMINI_API_KEY=your_gemini_api_key_here
TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe
```

Create the PostgreSQL database:

```sql
CREATE DATABASE yaobox;
```

Run the backend from the `backend` directory:

```bash
cd backend
uvicorn app.main:app --reload
```

Default backend URL:

```txt
http://127.0.0.1:8000
```

OpenAPI docs:

```txt
http://127.0.0.1:8000/docs
```

## Frontend Setup

In a second terminal:

```bash
cd frontend
npm install
```

Create the frontend environment file if needed:

```bash
cp .env.example .env
```

Expected frontend API base value:

```env
VITE_API_BASE_URL=http://127.0.0.1:8000
```

Run the frontend:

```bash
npm run dev
```

Default frontend URL:

```txt
http://127.0.0.1:5173
```

## Required Manual Demo Flow

Before presenting the project, manually test this exact flow:

1. Open the landing page.
2. Register a new user.
3. Log in.
4. Confirm dashboard loads.
5. Upload a medicine package image on the scan page.
6. Confirm OCR/AI processing finishes.
7. Confirm the result page shows:
   - medicine name if available
   - warnings/precautions if available
   - dosage/usage if available
   - AI explanation
   - raw OCR/extracted source text
   - trust/confidence/source indicators
8. Save or revisit the result in history.
9. Create a medication reminder.
10. Delete or edit the reminder.
11. Log out and confirm protected pages redirect to login.

## Important Safety Rules

YAOBOX handles medical information, so the application must keep trust boundaries clear:

- Verified medicine/database information is stronger than OCR or AI output.
- OCR text may be incomplete or wrong.
- AI translation/explanation may be incomplete or uncertain.
- The app must not claim to diagnose disease or prescribe treatment.
- Users should consult a doctor or pharmacist before acting on medical instructions.

## Environment and Secret Hygiene

Do not commit real secrets.

Ignored files include:

```txt
.env
.env.*
backend/.env
frontend/.env
```

Only templates such as `.env.example` should be committed.

If a real API key or database password was ever committed, rotate it immediately. Deleting it from the latest commit is not enough because Git history may still contain it.

## Development Checks

Frontend type check:

```bash
cd frontend
npx tsc -b --pretty false
```

Frontend production build:

```bash
cd frontend
npm run build
```

Backend import/compile sanity check:

```bash
python -m compileall -q backend/app
```

## Known Limitations

- OCR accuracy depends heavily on image quality, lighting, blur, glare, font size, and layout.
- AI translation should be reviewed and should not be treated as guaranteed medical advice.
- Reminder behavior depends on the current implementation and may require a notification/scheduler layer for production use.
- External AI calls require a valid API key and internet access.
