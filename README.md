# YAOBOX

YAOBOX is an AI-assisted web application that helps international users in China understand Chinese medicine information. The system supports medicine image upload, prescription/report upload, OCR extraction, AI-assisted English translation and explanation, scan history, medication reminders, profile management, settings, and a bounded medicine assistant.

YAOBOX is not a diagnosis system. It does not prescribe treatment, confirm medicine safety for a specific user, or replace a doctor or pharmacist. OCR and AI output must be treated as assistance, not guaranteed medical truth.

## Core Features

- User registration and login with JWT authentication
- Protected dashboard, scan, history, reminders, assistant, settings, and profile pages
- Medicine package image upload
- Prescription/report image upload
- Barcode-based medicine lookup flow
- OCR extraction from Chinese medicine text
- AI-assisted English translation and plain-language explanation
- Structured result view with dosage, usage, warnings, extracted text, confidence, and trust indicators
- Scan history with OCR text, AI explanation, source type, confidence, warnings, and trust notes
- Medication reminder creation, activation/deactivation, deletion, and browser notification support while the app is open
- User profile with scan/reminder summary and local avatar selection
- Settings page for theme, avatar, and navigation shortcuts
- Medicine assistant for limited medicine-information and wellness questions

## Tech Stack

### Backend

- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT authentication
- Tesseract OCR through `pytesseract`
- Image processing through OpenCV / Pillow
- Gemini API through `google-genai`

### Frontend

- React
- TypeScript
- Vite
- React Router
- TanStack Query
- Axios
- Zustand
- Motion
- Lucide icons
- Tailwind/global CSS structure

## Repository Structure

```txt
YAOBOX/
  backend/
    app/
      api/routes/       FastAPI route modules
      core/             settings, database, security helpers
      models/           SQLAlchemy models
      schemas/          Pydantic schemas
      services/         OCR, AI, scanner, medicine logic
    uploads/            runtime uploaded files, ignored except .gitkeep
    .env.example        backend environment template
  frontend/
    src/
      app/              router, layout, route guards
      api/              API clients and shared API types
      components/       shared UI components
      features/         auth, scan, history, reminders, profile, assistant
      hooks/            shared frontend hooks
      lib/              shared utilities
    package.json
    .env.example
  requirements.txt
  README.md