# PRIMIA — AI Platform for Credit Insurance Premium Pricing

![PRIMIA Demo](images/primia_demo.gif)

## Project Date

**December 2025**

## Overview

PRIMIA is an AI-powered SaaS platform designed for credit insurance companies. The platform automates the generation of personalized insurance quotes by extracting credit information from financial documents, calculating a company risk factor, optimizing the insurance premium and generating a structured quote.

The project was developed during the **Hack for Smart Insurance with AI** hackathon, organized by **Dauphine Tunis and EY**.

## Project Context

Credit insurance pricing is often based on static internal rules, manual analysis and limited automation. This can lead to underpricing, overpricing or delayed decision-making.

PRIMIA addresses this problem by providing a dynamic and risk-based pricing platform for insurers.

This project investigates the following question:

> How can AI and data-driven risk scoring improve the pricing of credit insurance premiums for companies?

## Business Problem

Credit insurance companies need more accurate and dynamic premium pricing systems.

Key challenges:

- Static pricing systems
- Manual quote generation
- Difficulty evaluating company-specific risk
- Lack of dynamic premium adjustment
- Risk of underpricing or overpricing
- Need for faster decision-making by insurers

## Solution

PRIMIA is a digital SaaS platform that helps insurers automate the calculation of credit insurance premiums for companies.

The platform provides:

- Financial report PDF upload
- AI-based credit information extraction
- Risk factor calculation
- Dynamic premium optimization
- Personalized quote generation
- Quote history
- User authentication
- Insurer-facing workflow

## Key Features

- User registration and authentication
- Insurance quote request submission
- Financial report PDF upload
- Credit information extraction using AI
- Risk factor calculation
- Dynamic premium and commission optimization
- Quote generation pipeline
- Quote history dashboard
- Supabase database integration

## AI and Data Pipeline

The core pipeline is composed of four main stages.

### Stage 1 — PDF Upload and Credit Extraction

The user uploads a financial or banking report.

The backend extracts text from the PDF and uses an AI extraction service to identify structured credit information such as:

- Credit amount
- Duration
- Interest rate
- Credit type

### Stage 2 — Risk Factor Calculation

The risk factor is calculated using several risk components:

- Credit amount risk
- Interest rate risk
- Duration risk
- Sector risk
- Claims history risk
- Credit type risk
- Financial status risk

These components are combined into a weighted risk score.

### Stage 3 — Premium and Commission Optimization

A Machine Learning model and optimization logic are used to estimate the optimal commission or premium rate.

The system uses:

- Base commission calculation
- Risk-adjusted optimization
- Gradient Boosting model
- Fallback optimization function when the ML model is unavailable

### Stage 4 — Quote Generation

The final quote is generated and stored in the database.

The final output includes:

- Extracted credit details
- Risk factor
- Optimized commission
- Final quote amount
- Quote status

## Pipeline Overview

```text
Financial Report PDF
        ↓
PDF Text Extraction
        ↓
AI Credit Information Extraction
        ↓
Risk Factor Calculation
        ↓
Premium / Commission Optimization
        ↓
Quote Generation
        ↓
User Dashboard + Quote History
```

## Tech Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Lucide React
- CSS

### Backend

- Node.js
- Express.js
- Multer
- Axios
- CORS
- Supabase
- JWT Authentication

### AI / Machine Learning

- Python
- Pandas
- NumPy
- Scikit-learn
- Joblib
- Google Generative AI / Gemini
- pypdf

### Database

- Supabase
- SQL scripts
- Relational database structure for users, credits, quotes, insurers, risk factors and optimal commissions

## Project Structure

```text
primia-credit-insurance-ai-platform/
│
├── README.md
├── .gitignore
├── docker-compose.yml
│
├── docs/
│   ├── PRIMIA_pitch_deck.pdf
│   ├── pipeline_documentation.md
│   ├── database_schema.md
│   └── model_setup_instructions.md
│
├── frontend/
│   ├── package.json
│   ├── index.html
│   ├── vite.config.ts
│   └── src/
│       ├── App.tsx
│       ├── pages/
│       ├── components/
│       ├── services/
│       └── context/
│
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── app.js
│   ├── controllers/
│   ├── routes/
│   ├── services/
│   ├── models/
│   ├── middleware/
│   ├── scripts/
│   ├── sql/
│   ├── data/
│   └── .env.example
│
├── ia_model/
│   ├── requirements.txt
│   ├── analyze_financials.py
│   └── data/
│
└── images/
    └── primia_demo.gif
```

## How to Run the Project

### 1. Clone the repository

```bash
git clone https://github.com/arefbakali/primia-credit-insurance-ai-platform.git
cd primia-credit-insurance-ai-platform
```

---

## Backend Setup

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Configure environment variables

Create a `.env` file inside the `backend/` folder:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
PYTHON_PATH=python
PORT=3000
```

Do not commit this `.env` file to GitHub.

You can keep a safe example file:

```text
backend/.env.example
```

Example content:

```env
GEMINI_API_KEY=your_gemini_api_key_here
SUPABASE_URL=your_supabase_url_here
SUPABASE_KEY=your_supabase_key_here
PYTHON_PATH=python
PORT=3000
```

### 4. Start the backend server

```bash
npm start
```

The backend should run on:

```text
http://localhost:3000
```

---

## Frontend Setup

### 5. Install frontend dependencies

Open a new terminal from the project root:

```bash
cd frontend
npm install
```

### 6. Start the frontend

```bash
npm run dev
```

The frontend should run on:

```text
http://localhost:5173
```

---

## Python / AI Model Setup

### 7. Create a Python virtual environment

From the project root or inside `ia_model/`:

```bash
python -m venv .venv
```

### 8. Activate the environment

On Windows:

```bash
.venv\Scripts\activate
```

On macOS/Linux:

```bash
source .venv/bin/activate
```

### 9. Install Python dependencies

```bash
cd ia_model
pip install -r requirements.txt
```

### 10. Verify the ML model files

The backend expects the trained commission model in:

```text
backend/models/commission_model.joblib
backend/models/model_metadata.json
```

If the model is missing, retrain it from the AI model folder according to the model setup instructions.

---

## Database Setup

The project uses Supabase as the database backend.

Database scripts are available in:

```text
backend/sql/
backend/scripts/
```

Main database elements include:

- Users
- Credits
- Insurers
- Quotes
- Credit offers
- Risk factors
- Optimal commissions

Run the SQL scripts in Supabase SQL Editor before testing the full quote pipeline.

## API Endpoints

Main backend routes include:

```text
/api/auth
/api/users
/api/credits
/api/insurers
/api/quotes
```

The most important quote generation endpoint is:

```text
POST /api/quotes/generate
```

This endpoint handles:

- PDF upload
- Credit extraction
- Risk scoring
- Premium optimization
- Quote generation

## How to Use the App

1. Register or log in.
2. Go to the user dashboard.
3. Select the company sector.
4. Upload a financial or banking PDF report.
5. Submit the quote request.
6. Wait for the AI pipeline to generate the quote.
7. View quote history and generated details.

## Requirements

### Backend

- Node.js
- npm
- Supabase account
- Gemini API key
- Python installed locally

### Frontend

- React
- TypeScript
- Vite

### Python

- pandas
- numpy
- scikit-learn
- joblib
- flask
- requests
- beautifulsoup4
- google-generativeai
- supabase
- pypdf
- python-dotenv

## Key Takeaways

- PRIMIA combines InsurTech, AI and SaaS architecture.
- The platform automates credit insurance quote generation.
- AI is used to extract structured credit information from PDF reports.
- A risk scoring system evaluates companies using multiple risk components.
- Premium pricing is adjusted dynamically based on real risk.
- The project includes a complete full-stack architecture with frontend, backend, database and AI services.
- The solution was developed in a hackathon context with a practical insurance use case.

## Limitations

- The project was developed in a hackathon context.
- Some financial data may be experimental or prototype-based.
- The scoring model should be validated with real insurance data before production use.
- API keys and database credentials must be secured before deployment.
- The PDF extraction pipeline depends on the quality and structure of uploaded documents.
- The premium optimization logic should be further tested with actuarial and insurance-domain experts.

## Future Improvements

- Improve financial report parsing with OCR
- Add explainability for the risk factor score
- Add SHAP analysis for the commission model
- Add an admin dashboard for insurers
- Add PDF export of generated quotes
- Add role-based access control
- Deploy frontend and backend online
- Add CI/CD and automated testing
- Add logging and monitoring
- Improve the UI/UX of the quote generation workflow

## Hackathon Context

This project was developed during **Hack for Smart Insurance with AI**, organized by **Dauphine Tunis and EY**.

## My Role

**Responsible AI**

Main contributions:

- AI pipeline design
- Risk factor calculation logic
- Credit information extraction workflow
- Premium optimization logic
- Integration between Python services and backend
- Contribution to the full quote generation pipeline

## Author

**Aref Bak Ali**<br>
AI, Data Science & Agentic AI Student<br>
GitHub: https://github.com/arefbakali<br>
LinkedIn: https://linkedin.com/in/aref-bak-ali/