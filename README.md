# 💧 AquaCheck

### Intelligent Water Quality Report Analysis Platform

AquaCheck is a software platform that transforms complex **water quality reports** into clear, understandable, and actionable insights.

Users can upload a water quality report in **PDF or image format**, and AquaCheck extracts the available parameters, validates and analyzes the data against selected reference standards, visualizes the results, and provides easy-to-understand explanations.

The platform combines **document processing, OCR, data analytics, rule-based water quality assessment, and open-source AI** to simplify the interpretation of water quality reports.

---

## 🚀 Problem

Water quality reports often contain technical parameters, numerical values, units, and reference limits that can be difficult for ordinary users to understand.

A user may receive a report containing values such as:

```text
pH          : 7.8
TDS         : 320 mg/L
Hardness    : 180 mg/L
Chloride    : 120 mg/L
```

However, simply displaying these numbers does not clearly communicate:

* What each parameter means
* Whether the reported value is within the selected reference range
* Which parameters require attention
* How the results have changed over time
* What the overall report indicates

AquaCheck addresses this gap by converting technical report data into a structured and understandable digital analysis.

---

## 💡 Our Solution

AquaCheck follows a simple workflow:

```text
Water Quality Report
        ↓
   Upload PDF/Image
        ↓
   Text / Table Extraction
        ↓
       OCR if needed
        ↓
 Parameter Identification
        ↓
 Data Validation & Normalization
        ↓
 AquaCheck Analysis Engine
        ↓
 Reference Standard Comparison
        ↓
 Results & Visualization
        ↓
 AI-Powered Explanation
        ↓
 Recommendations & History
```

The core water-quality assessment is performed using a **deterministic analysis engine**, while the AI layer is used to explain the technical results in a more understandable form.

---

# ✨ Key Features

## 📄 1. Water Quality Report Upload

Users can upload water quality reports in supported formats such as:

* PDF
* JPG
* PNG
* Scanned documents

---

## 🔍 2. Automatic Data Extraction

AquaCheck extracts available water-quality information from uploaded reports.

Potential parameters include:

* pH
* TDS
* Turbidity
* Total Hardness
* Chloride
* Fluoride
* Nitrate
* Iron
* Other available parameters

The system is designed to handle both digitally generated and scanned reports.

---

## 🧠 3. Intelligent Parameter Processing

Extracted information is converted into structured data.

Example:

```json
{
  "parameter": "pH",
  "value": 7.8,
  "unit": null
}
```

The processing pipeline performs:

* Data cleaning
* Unit normalization
* Parameter identification
* Type validation
* Missing-value handling

---

## 📊 4. Water Quality Analysis

AquaCheck compares extracted values against the selected reference standards.

Example:

```text
Parameter : pH
Value     : 8.7
Reference : 6.5 – 8.5

Result    : Above Reference Range
```

The analysis engine is designed to provide consistent and reproducible results rather than relying on an AI model to make the underlying numerical decision.

---

## 🧾 5. Rule-Based Explanation

AquaCheck formats each reported measurement, status, and reference range into a concise plain-language explanation. It runs immediately on the backend without a downloaded model or external AI service.

For example:

### Technical Result

```text
pH = 8.7
Status = Above Reference Range
```

### Explanation

> The reported pH is above the selected reference range, indicating that the sample is more alkaline than the reference value.

The explanation reuses the deterministic analysis results; it does not make new water-safety claims.

---

## 📈 6. Interactive Dashboard

The dashboard is designed to present:

* Overall report summary
* Parameter values
* Reference ranges
* Status indicators
* Charts
* Historical trends
* Plain-language explanations
* Recommendations

The goal is to make technical water-quality information easier to understand at a glance.

---

## 📚 7. Report History

Users can maintain a history of their uploaded reports.

This enables:

* Previous report viewing
* Historical comparison
* Parameter trend analysis
* Long-term monitoring

---

## 🔐 8. Secure User Accounts

AquaCheck uses **Supabase Authentication** for user management.

Each user's reports and analysis data are stored in **MongoDB Atlas** under
the user ID verified by the backend. The Atlas connection string is kept
server-side and report queries are scoped to that identity.

---

# 🏗️ System Architecture

```text
                         ┌──────────────────────┐
                         │        USER          │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    Next.js Frontend  │
                         │                      │
                         │ Dashboard            │
                         │ Upload               │
                         │ Reports              │
                         │ Charts               │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │    FastAPI Backend   │
                         └──────────┬───────────┘
                                    │
                    ┌───────────────┼────────────────┐
                    │               │                │
                    ▼               ▼                ▼
             ┌────────────┐  ┌────────────┐  ┌──────────────┐
             │ PDF        │  │ OCR        │  │ Data         │
             │ Extraction │  │ Processing │  │ Processing   │
             └─────┬──────┘  └─────┬──────┘  └──────┬───────┘
                   │               │                 │
                   └───────────────┼─────────────────┘
                                   ▼
                         ┌──────────────────────┐
                         │ Parameter Processing │
                         └──────────┬───────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │ AquaCheck Analysis   │
                         │ Engine               │
                         │                      │
                         │ Standards            │
                         │ Rules                │
                         │ Scoring              │
                         └──────────┬───────────┘
                                    │
                         ┌──────────┴───────────┐
                         │                      │
                         ▼                      ▼
                ┌─────────────────┐
                │ MongoDB Atlas   │
                │ Saved reports   │
                │ and analysis    │
                └─────────────────┘
                         ┌─────────────────┐
                         │ Supabase Auth   │
                         │ Identity only   │
                         └────────┬────────┘
                                  │
                                  ▼
                         ┌─────────────────┐
                         │ FastAPI verifies│
                         │ access tokens   │
                         └────────┬────────┘
                                  │
                                  └───────────┐
                                   ▼
                         ┌──────────────────────┐
                         │   AquaCheck Result   │
                         │                      │
                         │ Analysis             │
                         │ Visualization        │
                         │ Explanation          │
                         └──────────────────────┘
```

---

# 🛠️ Technology Stack

| Technology                    | Purpose                                              |
| ----------------------------- | ---------------------------------------------------- |
| **Next.js**                   | Frontend web application                             |
| **React**                     | Interactive UI components                            |
| **CSS**                       | Responsive and customized interface                  |
| **FastAPI**                   | Python backend and REST APIs                         |
| **Python**                    | Data processing and rule-based analysis              |
| **Supabase Auth**             | Email/password identity and access tokens            |
| **MongoDB Atlas**             | Managed cloud database for report analysis history   |
| **PyMuPDF**                   | PDF text extraction                                  |
| **Tesseract / EasyOCR**       | OCR for scanned reports                              |
| **Pandas**                    | Data cleaning and transformation                     |
| **Pydantic**                  | Data validation                                      |
| **Rule-based explanation**    | Immediate, deterministic result summaries            |
| **Recharts**                  | Data visualization                                   |
| **Git & GitHub**              | Version control and collaboration                    |

---

# 📁 Project Structure

```text
AquaCheck/
│
├── frontend/                  # Next.js application
│   ├── public/
│   └── src/
│       ├── app/
│       ├── components/
│       ├── hooks/
│       ├── lib/
│       └── styles/
│
├── backend/                   # FastAPI + Python
│   ├── app/
│   │   ├── api/
│   │   ├── extraction/
│   │   ├── analysis/
│   │   ├── ai/
│   │   ├── models/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── config/
│   │
│   └── tests/
│
├── supabase/
│   ├── migrations/
│   └── seed.sql
│
├── datasets/
│   ├── sample_reports/
│   ├── extracted_data/
│   └── test_cases/
│
├── docs/
│   ├── architecture.md
│   ├── api.md
│   ├── database.md
│   └── project-flow.md
│
├── .gitignore
├── README.md
└── LICENSE
```

---

# 🔄 Data Processing Pipeline

AquaCheck processes a report through multiple stages.

### Step 1 — Upload

```text
PDF / Image
```

### Step 2 — Document Processing

```text
PDF
 ↓
PyMuPDF

Scanned Image
 ↓
OCR
```

### Step 3 — Parameter Extraction

```text
Raw Text
 ↓
Parameter Parser
 ↓
Structured Parameters
```

### Step 4 — Validation

```text
Structured Data
 ↓
Pydantic
 ↓
Validated Data
```

### Step 5 — Normalization

```text
Different formats / units
 ↓
Standardized representation
```

### Step 6 — Analysis

```text
Parameter
   +
Value
   +
Unit
   ↓
Reference Standard
   ↓
Comparison
```

### Step 7 — AI Explanation

```text
Analysis Result
      ↓
Rule-Based Formatter
      ↓
Natural Language Explanation
```

### Step 8 — Visualization

```text
Analysis
   ↓
Dashboard
   ↓
Charts + Status + Explanation
```

### Current MVP support

`POST /api/reports/analyze` connects the text-based PDF steps: upload, embedded
text extraction, supported measurement parsing, validation, and deterministic
analysis. The frontend's `/upload` page displays the extracted measurements,
classifications, score, recommendations, a report-driven 3D particle
visualization, and an on-demand plain-language explanation. The visualization
is an illustration based on reported values, not a literal view of the water.
The explanation is generated immediately from the analysis rules when requested. The upload is
processed in memory and is not saved. Scanned PDFs and image OCR are not
available until an OCR provider is configured. See [docs/api.md](docs/api.md)
for the endpoint request and response details.

Supabase email/password authentication and MongoDB Atlas per-user report
history are available when configured. Copy the environment templates and set
the backend Atlas/Supabase credentials and frontend public Supabase/API URLs
as described in [docs/database.md](docs/database.md). The API verifies each
Supabase access token and only returns or saves reports for that authenticated
user. Atlas stores analysis results and report metadata, not uploaded PDF
files. Atlas hosts the managed database; the frontend and API still need their
own web hosting.

---

# 🧠 AquaCheck Intelligence

AquaCheck separates **analysis** from its **plain-language explanation**.

```text
                AQUACHECK INTELLIGENCE
                         │
             ┌───────────┴───────────┐
             │                       │
       ANALYSIS ENGINE       EXPLANATION
             │                    │
       Rule-based logic     Rule-based summary
             │                    │
       Standards comparison      │
             └───────────┬────────┘
                         ▼
                  Final User Result
```

This architecture keeps the numerical assessment and its explanation deterministic and consistent.

---

# 🎯 Target Users

AquaCheck is designed for anyone who receives or manages water-quality reports, including:

* 🏠 Households
* 🏢 Apartments and residential communities
* 🏫 Schools and colleges
* 🏨 Hotels
* 🍽️ Restaurants
* 🏥 Institutions
* 🏢 Offices
* 🏭 Businesses
* 💧 Water management teams
* 🏘️ Property and facility managers

The platform is not restricted to a specific income group or type of water user.

---

# 🌟 Key Advantages

### 📄 Report-Centric

Works from existing water-quality reports rather than requiring specialized hardware.

### 🧠 Explainable Analysis

The core assessment uses explicit comparison and analysis rules.

### 🧾 Instant Rule-Based Explanations

Formats structured analysis results directly, with no model startup, inference wait, or external AI service.

### 📊 Data Visualization

Converts numerical report information into understandable visual representations.

### 🔐 Secure Data Management

Uses Supabase Authentication for identity and MongoDB Atlas for saved report
data. The API checks each access token and filters reports by the verified user.

### 📈 Historical Tracking

Allows users to understand changes across multiple reports.

### ♻️ Scalable Architecture

The modular architecture allows additional parameters, report formats and analysis capabilities to be added later.

---


# 🔒 Data & AI Design Principles

AquaCheck follows these principles:

1. **The AI model should not be the sole source of numerical decisions.**
2. **Extracted values should be validated before analysis.**
3. **Reference standards should be explicitly identified.**
4. **AI-generated explanations should be based on structured analysis results.**
5. **User reports should be protected through authentication and database security.**
6. **The system should clearly distinguish measured values from interpretations.**

---

# 📌 Project Status

> 🚧 **AquaCheck is currently under active development.**

The project architecture and technology stack are being implemented incrementally, beginning with the frontend, backend, Supabase integration, report processing pipeline, and water-quality analysis engine.

---

# 🤝 Contributing

Contributions and suggestions are welcome.

```bash
# Clone the repository
git clone <repository-url>

# Move into the project
cd AquaCheck

# Create a feature branch
git checkout -b feature/your-feature

# Make your changes
git add .

# Commit
git commit -m "Add: your feature"

# Push
git push origin feature/your-feature
```

Create a pull request after completing your changes.

---

# 📄 License

This project is currently developed for educational and research purposes.

License details will be added as the project progresses.

---

## 💧 AquaCheck

### **Understand Your Water. Understand Your Report.**
