# 🏭 Ctrl-She – AI-Powered Industrial Knowledge Platform

# 🌐 Live Demo

🚀 **Live Application:**  
👉 https://ctrl-she.vercel.app

🎥 **Project Demo Video:**  
👉 *(Add your YouTube/Google Drive/Loom link here)*

📑 **Presentation (Optional):**  
👉 *(Add your PPT/PDF link here)*

---


# 📖 Overview

Ctrl-She is an **AI-powered Industrial Knowledge Management Platform** designed to centralize industrial documentation, maintenance records, compliance reports, safety documentation, insurance records, certifications, and asset intelligence into a single intelligent workspace.

Instead of searching through multiple folders and disconnected systems, engineers can simply ask questions in natural language and instantly receive accurate answers backed by AI.

---

# 🎯 Problem Statement

Industrial organizations face several challenges:

- Engineers spend significant time searching for information.
- Documents are scattered across multiple storage systems.
- Critical operational knowledge is lost when experienced employees retire.
- Compliance documentation is difficult to manage.
- Maintenance history is difficult to analyze.
- Asset documentation lacks centralization.
- Manual report generation increases operational delays.

Ctrl-She solves these challenges by creating a unified AI-powered industrial knowledge hub.

---

# ✨ Features

## 🤖 AI Knowledge Assistant

- AI Chat with industrial documents
- Natural language search
- Semantic search
- Context-aware responses
- Citation-based answers

---

## 📄 Intelligent Document Management

- Upload PDF manuals
- Upload SOPs
- Upload Maintenance Documents
- Upload Compliance Reports
- Upload Safety Documentation
- AI document indexing
- Version control

---

## 🏭 Asset Management

- Asset Inventory
- Machine Information
- Maintenance History
- Warranty Tracking
- Insurance Tracking
- License Management
- Certification Management
- Spare Parts Inventory

---

## 🛠 Maintenance Intelligence

- Preventive Maintenance
- Corrective Maintenance
- Predictive Maintenance
- Work Orders
- RCA Reports
- Maintenance Analytics
- Failure Analysis

---

## ✅ Quality & Compliance

- NCR Reports
- CAPA
- Audit Reports
- ISO Compliance
- Safety Compliance
- Regulatory Documentation

---

## 🦺 Safety Management

- Incident Reports
- Near Miss Reports
- Risk Assessments
- PPE Documentation
- Safety Inspections

---

## 📊 Analytics Dashboard

- Maintenance KPIs
- Asset Health
- Compliance Status
- Document Statistics
- AI Usage Analytics
- Department Performance

---

# 👥 User Roles

| Role | Access |
|-------|---------|
| Plant Manager | Full Access |
| Maintenance Manager | Maintenance + Assets + Analytics |
| Maintenance Engineer | Maintenance + RCA |
| Production Engineer | Production Documents |
| Plant Operations Engineer | Asset Operations |
| Reliability Engineer | Predictive Maintenance |
| Quality Engineer | Quality Documents |
| QA Manager | Compliance |
| Safety Officer | Safety Reports |
| HSE Engineer | Safety & Compliance |

---

# 🏗 System Architecture

```text

                        +-------------------------+
                        |      React Frontend     |
                        |  (Vite + TypeScript)    |
                        +-----------+-------------+
                                    |
                                    |
                          REST API / Supabase SDK
                                    |
                                    |
                  +-----------------+-----------------+
                  |                                   |
                  |         Supabase Backend          |
                  |-----------------------------------|
                  | Authentication                    |
                  | Database                          |
                  | Storage                           |
                  | Row Level Security                |
                  +-----------------+-----------------+
                                    |
          -----------------------------------------------------
          |                |                |                 |
          |                |                |                 |
    Asset Data      Maintenance      Documents        Compliance
          |                |                |                 |
          -----------------------------------------------------
                                    |
                                    |
                            AI Processing Layer
                                    |
                      Semantic Search + AI Chat
                                    |
                           Knowledge Responses

```

---

# 🗄 Database Architecture

```text

Users
│
├── Roles
│
├── Departments
│
├── Assets
│      │
│      ├── Maintenance
│      ├── Insurance
│      ├── Licenses
│      ├── Certifications
│
├── Documents
│
├── RCA Reports
│
├── NCR Reports
│
├── Safety Reports
│
└── Analytics

```

---

# ⚙ Technology Stack

## Frontend

- React 19
- TypeScript
- Vite
- Tailwind CSS
- ShadCN UI
- React Router

---

## Backend

- Supabase
- Authentication
- Row Level Security
- REST APIs

---

## Database

- PostgreSQL (Supabase)

Features:

- Foreign Keys
- Row Level Security
- Relationships
- Real-time Database
- Storage Buckets

---

## AI

- AI Chat
- Semantic Search
- Intelligent Document Retrieval
- Natural Language Processing

---

# 📂 Project Structure

```text

Ctrl-She/

│

├── src/

│   ├── components/

│   ├── pages/

│   ├── hooks/

│   ├── lib/

│   ├── services/

│   ├── routes/

│   └── styles/

│

├── public/

├── supabase/

│

├── docs/

│

├── package.json

├── vite.config.ts

└── README.md

```

---

# 🔑 Environment Variables

Create a `.env` file.

```env

VITE_SUPABASE_URL=your_supabase_url

VITE_SUPABASE_ANON_KEY=your_supabase_key

```

---

# 📸 Screenshots

```
docs/

├── login.png

├── dashboard.png

├── assets.png

├── ai-chat.png

├── analytics.png

├── compliance.png

```

---

# 🔄 Application Workflow

```text

User Login
      │
      ▼
Authentication
      │
      ▼
Dashboard
      │
      ├──────── Assets
      │
      ├──────── Documents
      │
      ├──────── Maintenance
      │
      ├──────── Compliance
      │
      ├──────── Safety
      │
      └──────── AI Chat
                    │
                    ▼
           AI Knowledge Search
                    │
                    ▼
         Intelligent Response

```

---

# 🔐 Security

- Supabase Authentication
- Role Based Access Control
- Row Level Security
- Secure Storage
- Protected Routes
- JWT Authentication

---

# 📊 Future Improvements

- Voice Assistant
- OCR for Scanned Manuals
- IoT Integration
- Predictive Maintenance AI
- Mobile Application
- Digital Twin Integration
- ERP Integration
- SAP Integration

---

# 👨‍💻 Team

### Team Ctrl-She

AI Powered Industrial Knowledge Platform

Hackathon Project

---

# 📜 License

This project is licensed under the MIT License.

---

# ⭐ Support

If you found this project useful, consider giving it a ⭐ on GitHub.
