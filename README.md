# 🏭 Ctrl+She – AI-Powered Industrial Knowledge Platform

# 🌐 Live Demo

🚀 **Live Application:**  
👉 https://ctrl-she.vercel.app

🎥 **Project Demo Video:**  
👉 (https://drive.google.com/drive/folders/1CMPMVG6EmxGlR0JImjYzfXSGg95Ay-Og)


---


# 📖 Overview

Ctrl+She is an **AI-powered Industrial Knowledge Management Platform** designed to centralize industrial documentation, maintenance records, compliance reports, safety documentation, insurance records, certifications, and asset intelligence into a single intelligent workspace.

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

Ctrl+She solves these challenges by creating a unified AI-powered industrial knowledge hub.

---

# 💡 Our Solution

Ctrl+She is more than a document management system—it is an **AI-powered Industrial Operations Brain** that transforms fragmented industrial knowledge into a centralized, intelligent, and searchable platform.

Our solution combines Artificial Intelligence, role-based access control, secure authentication, and industrial asset management into one unified ecosystem. Instead of switching between multiple systems for maintenance records, compliance documents, safety reports, manuals, and asset information, users can access everything from a single dashboard.

Unlike traditional document repositories, Ctrl+She understands the context of industrial documents and enables engineers to ask questions in natural language. The AI Assistant retrieves relevant information from uploaded documents and provides accurate, citation-backed responses, helping teams make faster and more informed decisions.

The platform also digitizes maintenance workflows, compliance tracking, insurance management, certification records, inventory monitoring, and Root Cause Analysis (RCA), creating a complete digital workspace for modern manufacturing industries.

---

# 🚀 Key Innovations & Customizations

Our implementation extends beyond the original problem statement by introducing several practical industry-focused enhancements:

### 🤖 AI-Powered Knowledge Copilot
- Natural language AI assistant for industrial documentation
- Citation-backed answers from uploaded documents
- Semantic search for faster information retrieval
- Intelligent document understanding

### 🏭 Unified Asset Intelligence
- Complete asset inventory management
- Machine lifecycle tracking
- Equipment health monitoring
- Maintenance history
- Warranty tracking

### 🛠 Smart Maintenance Management
- Preventive Maintenance
- Corrective Maintenance
- Predictive Maintenance
- Root Cause Analysis (RCA)
- Maintenance analytics dashboard

### 📦 Inventory & Spare Parts Management
- Spare parts inventory
- Current stock monitoring
- Minimum stock alerts
- Purchase request management
- Asset procurement tracking

### 📑 Insurance, Licenses & Certifications
One of our major customizations was introducing a dedicated module for:

- Machine Insurance Management
- Equipment Licenses
- Regulatory Certifications
- Expiry tracking
- Renewal reminders

This ensures organizations never miss critical compliance deadlines.

### ✅ Quality & Compliance Intelligence
- Non-Conformance Reports (NCR)
- Compliance Framework Mapping
- Inspection Management
- Audit Readiness
- ISO and Industrial Compliance Tracking

### 🦺 Safety Management
- Safety incident reporting
- Near Miss reporting
- Risk assessment
- Safety inspection records
- Workplace compliance monitoring

### 👥 Role-Based Workspace
Every user sees a personalized workspace based on their responsibilities.

Supported roles include:

- Plant Manager
- Maintenance Engineer
- Reliability Engineer
- Quality Engineer
- Safety Officer
- HSE Engineer
- Production Engineer
- Plant Operations Engineer
- QA Manager

Each role has customized permissions using Role-Based Access Control (RBAC).

### 🔐 Enterprise-Grade Security
- Secure Supabase Authentication
- Row-Level Security (RLS)
- Protected Routes
- JWT Authentication
- Role-Based Authorization

### 📊 Advanced Analytics Dashboard
Interactive dashboards provide insights into:

- Asset Health
- Maintenance KPIs
- Compliance Status
- Inventory Overview
- AI Usage Analytics
- Department Performance

---
# 📄 Page & Module Overview

A breakdown of every module in the platform and what it does:

- Dashboard: Displays a central calendar tracking scheduled work orders and custom reminders, high-level plant KPIs, and user-profile greetings.
- AI Copilot: Interactive RAG chatbot grounded on document text chunks and live database schemas. Supports voice input, uploads, and visual OCR analysis, proposing structured actions (create_work_order, update_asset, close_ncr) for user approval.
- Knowledge Graph: Relationship map representing Assets, Documents, Personnel, NCRs, and RCAs. Runs force-directed layouts, supporting zooming, node filtering, and search.
- Documents: Repository vault for plant documents. Handles drag-and-drop file uploads, metadata editing, secure signed URL previews/downloads, and RAG edge-function reprocessing.
- Maintenance Intelligence: Central dashboard for work orders, RCAs, live asset health cards, and dynamically calculated asset health AI recommendations.
- Quality & Compliance: Tracks compliance frameworks (e.g. ISO 9001), inspections schedules/logs, and Non-Conformance Reports (NCRs).
- Lessons Learned: Incident log timeline (RCAs + NCRs), systemic AI failure patterns from the database, and standard knowledge articles.
- Insurance & Certs: Tracks machine licenses, certifications, and policies, featuring a manual check flow to flag expiring items.
- Asset Inventory: Split tab overview showing Assets status/health and Spare Parts stock levels, supporting CSV and PDF reports export.
- Analytics: Renders graphs for work order status, critical alerts, maintenance distribution, and a plant health map.
- Notifications: Inbox sorted by category (maintenance, compliance, documents, system, AI) and priority.
- Procurement Workflow: Track purchase requests, approve/reject/modify actions, and link procured hardware to assets.
- Settings: Manages appearance (Light/Dark themes synced via Zustand) and toggle preferences for communication channels (Email, In-App, Push, SMS).

---
# 🔔 Notifications System
<table> <tr><th>Trigger Event</th><th>Target Recipient(s)</th><th>Notification Category</th><th>Priority</th></tr> <tr><td>Inspection Assigned</td><td>Specific Assignee User(s)</td><td><code>compliance</code></td><td>Medium</td></tr> <tr><td>Inspection Overdue</td><td>Inspection Creator &amp; Assignees</td><td><code>compliance</code></td><td>High</td></tr> <tr><td>Inspection Completed</td><td>Inspection Creator &amp; All Safety Officers</td><td><code>compliance</code></td><td>Medium</td></tr> <tr><td>New Work Order Created</td><td>All Maintenance &amp; Reliability Engineers</td><td><code>maintenance</code></td><td>Varied</td></tr> <tr><td>Work Order Assigned</td><td>Assigned Maintenance Engineer</td><td><code>maintenance</code></td><td>Varied</td></tr> <tr><td>Work Order Completed</td><td>WO Creator, Plant Managers, Safety Officers</td><td><code>maintenance</code></td><td>Varied</td></tr> <tr><td>Work Order Verified</td><td>Assigned Maintenance Engineer</td><td><code>maintenance</code></td><td>Varied</td></tr> <tr><td>Work Order Rejected</td><td>Assigned Maintenance Engineer</td><td><code>maintenance</code></td><td>High</td></tr> <tr><td>RCA Report Logged</td><td>Reliability, Maintenance Engineers &amp; Managers</td><td><code>maintenance</code></td><td>Medium</td></tr> <tr><td>New NCR Logged</td><td>All Quality Engineers &amp; Safety Officers</td><td><code>compliance</code></td><td>Varied</td></tr> <tr><td>NCR Resolved</td><td>Quality, Safety Officers &amp; Plant Managers</td><td><code>compliance</code></td><td>Medium</td></tr> <tr><td>Compliance Expired (Manual Check)</td><td>All Safety Officers</td><td><code>compliance</code></td><td>High</td></tr> <tr><td>Compliance Expiring Soon</td><td>All Safety Officers</td><td><code>compliance</code></td><td>Medium</td></tr> <tr><td>Compliance Renewed</td><td>Renewing User</td><td><code>compliance</code></td><td>Medium</td></tr> <tr><td>Calendar Reminder Due</td><td>Specific User</td><td><code>system</code></td><td>Medium</td></tr> </table>

---

# 🌟 What Makes Ctrl+She Different?

Unlike conventional maintenance or document management systems, Ctrl+She combines multiple industrial functions into a single intelligent platform.

Our solution integrates:

- 📄 AI-powered Knowledge Management
- 🏭 Asset Management
- 🛠 Maintenance Intelligence
- 📦 Inventory Management
- 📑 Insurance & Certification Tracking
- ✅ Compliance Management
- 🦺 Safety Reporting
- 📊 Business Analytics
- 🤖 AI Copilot
- 🔐 Secure Role-Based Access Control

This creates a true **Industry 4.0 Digital Operations Brain**, enabling engineers, quality teams, maintenance teams, and management to collaborate efficiently from one centralized platform.

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

## 📸 Project Screenshots

### Synapse
![Synapse](SynapseAI.png)

### Roles Explanation
![Roles Explanation](Roles_explanantion.jpeg)

### Explanation 2
![Explanation 2](Explanation2.jpeg)

### Explanation 3
![Explanation 3](Explanation3.jpeg)

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
# 🔁 Detailed Cross-Role Workflows

- A. Compliance Inspection Lifecycle
Schedule: A Quality Engineer or Safety Officer schedules an inspection.
Assign & Notify: Assigned Maintenance Engineers or Safety Officers receive individual notifications.
Execution: The assigned engineer completes the inspection (marking it Pass, Fail, or Needs Follow-up, recording findings, and noting delay reasons if completed late).
Log Results: The inspection creator and all Safety Officers are notified of the completion.
Quality Escalation: If the inspection fails or requires follow-up, the system prompts the option to instantly convert it into a Non-Conformance Report (NCR) card.

- B. Maintenance Work Order & Verification Flow
Creation: A Plant Manager, Plant Ops, or Reliability Engineer creates a Work Order.
Assignment: The maintenance team is notified role-wide; the designated assignee receives a specific notification and is assigned a linked reminder in the calendar.
Completion: The engineer performs the task and marks the Work Order Completed.
Verification Alert: The creator, all Plant Managers, and all Safety Officers receive notifications to verify the work.
Closure or Rework:
Verification: If verified, the Plant Manager closes the Work Order, resolving/archiving the calendar reminder and notifying the assignee.
Rejection: If rejected, the status returns to Pending, and the assignee is notified of rework notes.

- C. Non-Conformance (NCR) Resolution
Logging: Quality Engineers, Safety Officers, or Plant Ops log an NCR.
Alert: Quality Engineers and Safety Officers are notified role-wide; the NCR appears on the Quality & Compliance board.
Resolution: An authorized user resolves the NCR, entering resolution notes, which recalculates compliance scorecards and notifies relevant roles.

- D. Root Cause Analysis (RCA) Handoff
Log RCA: A Reliability Engineer logs an RCA report following a failure, notifying reliability, maintenance, and manager roles.
WO Conversion: From the RCA, corrective actions can be converted into new Work Orders, linking the new WO back to the source RCA record.

- E. Procurement & Installation Flow
Requisition: Maintenance Engineers or Safety Officers submit Purchase Requests.
Review: The Plant Manager approves, rejects, or requests modifications (returning requests to engineers with notes).
Receiving & Installation: Once marked as Procured, the user can link it to an existing asset or register a new asset, establishing the linked asset database ID.

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

### Team Ctrl+She

AI Powered Industrial Knowledge Platform

Hackathon Project

---

# 📜 License

This project is licensed under the MIT License.

---
