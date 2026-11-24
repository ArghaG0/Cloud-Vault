# CloudVault — Cloud-Based Student Document Management and Backup System

[![Node.js Version](https://img.shields.io/badge/Node.js-v20%2B-339933?logo=node.js)](https://nodejs.org/)
[![React Version](https://img.shields.io/badge/React-v19-61DAFB?logo=react)](https://react.dev/)
[![Express Version](https://img.shields.io/badge/Express-v5.3-000000?logo=express)](https://expressjs.com/)
[![Database](https://img.shields.io/badge/Database-MongoDB%20Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Cloud Storage](https://img.shields.io/badge/Cloud%20Storage-Amazon%20S3-FF9900?logo=amazons3)](https://aws.amazon.com/s3/)
[![License](https://img.shields.io/badge/License-Academic%20Evaluation-blue.svg)](#)

**CloudVault** is an academic document repository, organization, and cloud disaster-recovery platform engineered for university students. It combines a **React 19 / Vite** frontend with a **Node.js / Express 5** backend, **MongoDB Atlas** metadata persistence, and direct-to-cloud **Amazon Simple Storage Service (Amazon S3)** object storage.

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Key Architecture & Features](#key-architecture--features)
3. [Technology Stack](#technology-stack)
4. [System Architecture Diagram](#system-architecture-diagram)
5. [Repository Structure](#repository-structure)
6. [Getting Started & Local Setup](#getting-started--local-setup)
7. [Testing with Postman](#testing-with-postman)
8. [API Route Reference](#api-route-reference)
9. [Companion Documentation](#companion-documentation)

---

## Project Overview

University students frequently manage academic coursework, lecture slide decks, laboratory code bundles, past exam papers, and capstone project reports across disparate personal devices, USB drives, and fragmented folders. This leads to version corruption, accidental deletions, and lost coursework.

**CloudVault** solves this by providing:
- **Centralized Cloud Ingestion:** Fast, direct-to-cloud file uploads to private Amazon S3 buckets.
- **Accidental Deletion Recovery:** Multi-version retention using **Amazon S3 Object Versioning**.
- **Atomic Quota Accounting:** Enforcing a strict 10 GB quota per student to prevent storage abuse.
- **Categorization & Global Search:** Instant faceted search across course codes, tags, and document categories.
- **Security & Privacy:** Industry-standard **HttpOnly cookie authentication**, bcrypt password hashing, and zero-exposure presigned S3 URLs.

---

## Key Architecture & Features

### 1. Direct-to-S3 Presigned Upload Pipeline (ADR-02)
Rather than routing 50 MB files through the Node.js server (which causes memory bottlenecks and double-bandwidth costs), CloudVault uses a **Three-Step Direct-to-Cloud Pipeline**:
1. **Request URL:** Client requests upload authorization (`POST /api/documents/upload-url`). The backend validates quota and generates a 15-minute Amazon S3 presigned `PUT` URL.
2. **Direct Upload:** The client uploads the binary directly to Amazon S3 via `PUT`. S3 returns `200 OK`.
3. **Independent Verification:** The client calls `POST /api/documents/finalize`. The backend contacts AWS S3 via `HeadObjectCommand` to independently verify physical file existence, exact byte size, and Content-Type before committing the record to MongoDB.

### 2. Atomic Quota Reservation Pattern (ADR-05)
To prevent race conditions where concurrent parallel uploads exceed a student's 10 GB limit:
- When an upload URL is requested, MongoDB atomically reserves `reservedBytes`.
- If two 20 MB uploads are fired with only 30 MB remaining, exactly one succeeds and the second is rejected atomically (`403 Forbidden`).
- If an upload is cancelled, `POST /api/documents/abort-upload` refunds the reservation immediately.

### 3. Cloud Backup & Historical Recovery (ADR-04)
- Uploaded files are backed by **Amazon S3 Object Versioning**.
- Overwriting a file preserves prior iterations with unique S3 Version IDs.
- Historical versions can be listed and restored with a single click.

### 4. Two-Tier Deletion (Soft Delete / Trash)
- **Soft Delete:** Deleting a document moves it to Trash (`isTrash: true`), refunds active user quota immediately, but keeps the physical file safely in S3 for 30 days.
- **Permanent Purge:** Emptying Trash issues S3 `DeleteObjectCommand` to permanently destroy the S3 object and deletes the MongoDB document.

### 5. Secure Authentication & Session Isolation
- Passwords hashed with **bcryptjs** (work factor 12, ~4,096 iterations).
- Sessions authenticated via **HttpOnly, Secure Cookies** (`cloudvault_token`) with `Authorization: Bearer` fallback for API testing.
- Strict tenant isolation: every query enforces `{ _id: docId, userId: req.user._id }`.

---

## Technology Stack

| Layer | Technologies | Purpose |
|---|---|---|
| **Frontend** | React 19, Vite 8, Tailwind CSS, Material Symbols Outlined, Geist Font | High-density academic UI, light/dark theme, responsive drawer navigation |
| **Backend** | Node.js (v20+), Express 5, cookie-parser, cors, morgan, dotenv | RESTful routing, quota coordination, security middleware |
| **Database** | MongoDB Atlas, Mongoose (v9.13) | Flexible document schema, compound indexes, atomic `$inc` operators |
| **Cloud Storage** | Amazon Web Services (AWS) Simple Storage Service (S3) | Secure, private, centralized cloud storage (Bucket: `cloudvault-student-docs`) |
| **AWS SDK** | AWS SDK for JavaScript v3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`) | Generating presigned `PUT`/`GET` URLs, `HeadObject` verification, object purging |
| **Security** | `jsonwebtoken` (JWT), `bcryptjs` | Stateless session management and adaptive password hashing |

---

## System Architecture Diagram

```
┌────────────────────────────────────────────────────────┐
│                   React 19 Frontend                    │
│      (Dashboard, My Documents, Dropzone Ingest)        │
└──────────────┬───────────────────────────▲─────────────┘
               │                           │
  1. Request Presigned URL                 │ 3. Direct Binary PUT
  (name, size, MIME, cat)                  │    (Bypasses Express)
               │                           │
               ▼                           │
┌──────────────────────────────┐           │
│    Node.js / Express 5 API   │           │
│  - Quota Reservation         │           │
│  - JWT Cookie Auth           │           │
│  - Generates Presigned URLs  │           │
└──────┬────────────────▲──────┘           │
       │                │                  │
 2. Read/Write    4. HeadObject            │
    Metadata         Verification          │
       │                │                  │
       ▼                ▼                  ▼
┌──────────────┐   ┌──────────────────────────────┐
│MongoDB Atlas │   │      Amazon S3 Bucket        │
│(Users, Docs, │   │   (ap-southeast-2, Sydney)   │
│ Activities)  │   │  - S3 Object Versioning      │
└──────────────┘   │  - Server-Side Encryption    │
                   └──────────────────────────────┘
```

---

## Repository Structure

```
d:\Projects\CCS3/
├── README.md                           # Master Project Documentation (This File)
├── .gitignore                          # Root Git ignore rules (node_modules, .env, dist)
├── doc/
│   └── Cloud_Based_Student_Document_Management_SRS.md  # Software Requirements Specification
├── docs/                               # Architectural & Engineering Specifications
│   ├── ARCHITECTURE_DECISIONS.md       # Formal Architecture Decision Records (ADR 01-05)
│   ├── SECURITY_REVIEW.md              # Threat Model, Quota Integrity & Security Review
│   ├── API_CONTRACT.md                 # Complete REST API Specification (13 Views)
│   ├── BACKEND_AND_INTEGRATION_PLAN.md # Master Backend & Integration Blueprint
│   ├── BACKEND_TESTING_PLAN.md         # Unit, Integration & Concurrency Test Plan
│   ├── DESIGN.md                       # Design System & UI/UX Architecture Specification
│   └── PROJECT_STRUCTURE.md            # Frontend Component Hierarchy & Assets
├── postman/                            # Postman Testing Suite
│   ├── CloudVault.postman_collection.json   # Postman Collection v2.1 (All Endpoints)
│   └── CloudVault.postman_environment.json  # Pre-configured Local Environment
├── client/                             # React 19 Frontend Application
│   ├── src/
│   │   ├── components/                 # Primitives (Button, Modal, Dropdown, Table)
│   │   ├── context/                    # AuthContext, ThemeContext, ToastContext
│   │   ├── pages/                      # Dashboard, MyDocuments, Upload, Storage, etc.
│   │   └── services/                   # Service abstractions (apiClient, documentService)
│   ├── package.json
│   └── tailwind.config.js
└── server/                             # Node.js + Express 5 Backend Application
    ├── .env                            # Environment secrets (Protected by Git)
    ├── server.js                       # Express application entry point
    ├── package.json
    └── src/
        ├── config/                     # db.js (MongoDB) & s3.js (AWS SDK v3)
        ├── models/                     # User, Document, Category, Activity, Session
        ├── middleware/                 # auth.js (HttpOnly cookie JWT), errorHandler
        ├── services/                   # s3Service.js (Presigned URLs, HeadObject, Delete)
        ├── controllers/                # authController, documentController, dashboardController
        └── routes/                     # authRoutes, documentRoutes, dashboardRoutes, etc.
```

---

## Getting Started & Local Setup

### Prerequisites
1. **Node.js:** v20.x or higher installed (`node -v`).
2. **MongoDB Database:** A MongoDB Atlas URI or local MongoDB instance (`mongodb://localhost:27017/cloudvault`).
3. **AWS S3 Bucket:** An Amazon S3 bucket with an IAM user having `PutObject`, `GetObject`, `DeleteObject`, and `HeadObject` permissions.

---

### Step 1: Server Configuration & Startup

1. Open a terminal and navigate to `server/`:
   ```bash
   cd server
   npm install
   ```

2. Verify or update `server/.env`:
   ```ini
   # Server Port & Environment
   PORT=5000
   NODE_ENV=development
   CLIENT_URL=http://localhost:5173

   # Authentication (JWT)
   JWT_SECRET=your_super_secret_random_jwt_key_here
   JWT_EXPIRES_IN=7d

   # Database (MongoDB Atlas)
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxx.mongodb.net/cloudvault?retryWrites=true&w=majority

   # AWS S3 Storage Configuration
   AWS_REGION=ap-southeast-2
   AWS_BUCKET_NAME=cloudvault-student-docs
   AWS_ACCESS_KEY_ID=your_aws_access_key_id
   AWS_SECRET_ACCESS_KEY=your_aws_secret_access_key

   # Set to true only if testing locally without AWS credentials
   OFFLINE_MODE=false
   ```

3. Configure Amazon S3 Bucket CORS:
   In the **AWS Management Console > S3 > Your Bucket > Permissions > Cross-origin resource sharing (CORS)**, save the following:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
       "AllowedOrigins": ["http://localhost:5173", "http://localhost:3000"],
       "ExposeHeaders": ["ETag"]
     }
   ]
   ```

4. Launch the backend server:
   ```bash
   npm run dev
   ```
   *Terminal output will confirm:*
   ```
   [AWS S3] Initialized S3 Client for region: ap-southeast-2
   [Database] MongoDB Connected: MongoDB Atlas
   CloudVault Server running on http://localhost:5000
   ```

---

### Step 2: Client Configuration & Startup

1. Open a second terminal and navigate to `client/`:
   ```bash
   cd client
   npm install
   ```

2. Start the Vite development server:
   ```bash
   npm run dev
   ```
3. Open your browser and navigate to `http://localhost:5173`.

---

## Testing with Postman

A complete, production-ready Postman testing suite is included in [`postman/`](file:///d:/Projects/CCS3/postman):

### How to Import and Test:
1. Open the Postman Desktop App.
2. Click **Import** (top left).
3. Select both files:
   - `postman/CloudVault.postman_collection.json`
   - `postman/CloudVault.postman_environment.json`
4. Select the **CloudVault Local Environment** in the top-right environment selector.
5. Execute requests in order:
   - **Step 1:** In `2. Authentication`, send **`Student Registration`** (or `Student Login`). The test script automatically saves the JWT token into `{{token}}`.
   - **Step 2:** In `3. Document Storage & Lifecycle`, send **`Step 1: Request Presigned Upload URL`**. Generates `{{uploadUrl}}` and `{{documentId}}`.
   - **Step 3:** Send **`Step 1.5 (Direct S3): Upload Binary File to S3`**. Sends the physical binary directly to AWS S3; Amazon returns **`200 OK`**.
   - **Step 4:** Send **`Step 2: Finalize Upload`**. The backend calls S3 `HeadObject`, verifies the file in S3, commits metadata to MongoDB, and returns **`201 Created`**.
   - **Step 5:** Send **`List Documents`**, **`Get Presigned Download URL`**, **`Update Document`**, and **`Soft Delete`**.

---

## API Route Reference

All document routes require authentication and enforce strict student isolation:

| Category | Method | Endpoint | Description |
|---|---|---|---|
| **System** | `GET` | `/api/health` | Service health and environment status |
| **Auth** | `POST` | `/api/auth/register` | Student registration with bcrypt hashing |
| **Auth** | `POST` | `/api/auth/login` | Student login with HttpOnly cookie issuance |
| **Auth** | `GET` | `/api/auth/me` | Authenticated profile and live quota stats |
| **Auth** | `POST` | `/api/auth/logout` | Clears HttpOnly cookie |
| **Upload** | `POST` | `/api/documents/upload-url` | Reserves quota and generates S3 presigned PUT URL |
| **Upload** | `POST` | `/api/documents/finalize` | Verifies S3 `HeadObject` and commits document |
| **Upload** | `POST` | `/api/documents/abort-upload` | Releases reserved quota on cancelled upload |
| **Documents** | `GET` | `/api/documents` | Paginated search, category, and extension filtering |
| **Documents** | `GET` | `/api/documents/:id` | Single document metadata |
| **Documents** | `GET` | `/api/documents/:id/download-url` | Presigned S3 GET URL (attachment download) |
| **Documents** | `GET` | `/api/documents/:id/preview-url` | Presigned S3 GET URL (inline browser preview) |
| **Documents** | `PATCH` | `/api/documents/:id` | Renames display name or updates category/tags |
| **Documents** | `DELETE`| `/api/documents/:id` | Soft delete to Trash (quota refunded) |
| **Documents** | `DELETE`| `/api/documents/:id/purge` | Permanently destroys S3 file and MongoDB record |
| **Batch** | `POST` | `/api/documents/batch-delete` | Batch soft delete multiple items |
| **Batch** | `POST` | `/api/documents/batch-move` | Batch category reassignment |
| **Telemetry** | `GET` | `/api/dashboard/stats` | Aggregated dashboard stats & S3 health |
| **Telemetry** | `GET` | `/api/storage/telemetry` | AWS S3 bucket status, versioning, encryption |
| **Telemetry** | `GET` | `/api/storage/logs` | Paginated verified S3 object keys and checksums |
| **Categories**| `GET` | `/api/categories` | Categories with live document counts and MB |
| **Audit** | `GET` | `/api/activities` | Chronological student audit log stream |

---

## Companion Documentation

Detailed technical and architectural specifications are maintained in the [`docs/`](file:///d:/Projects/CCS3/docs) directory:

- [docs/ARCHITECTURE_DECISIONS.md](file:///d:/Projects/CCS3/docs/ARCHITECTURE_DECISIONS.md) — Architecture Decision Records (ADR 01-05).
- [docs/SECURITY_REVIEW.md](file:///d:/Projects/CCS3/docs/SECURITY_REVIEW.md) — Threat model, quota integrity, and encryption verification.
- [docs/API_CONTRACT.md](file:///d:/Projects/CCS3/docs/API_CONTRACT.md) — Exhaustive REST API specification covering all 13 screens.
- [docs/BACKEND_AND_INTEGRATION_PLAN.md](file:///d:/Projects/CCS3/docs/BACKEND_AND_INTEGRATION_PLAN.md) — Master implementation and frontend integration plan.
- [docs/BACKEND_TESTING_PLAN.md](file:///d:/Projects/CCS3/docs/BACKEND_TESTING_PLAN.md) — Test plan for unit, integration, and concurrency suites.
- [docs/DESIGN.md](file:///d:/Projects/CCS3/docs/DESIGN.md) — Design system tokens and UI/UX architecture.
- [doc/Cloud_Based_Student_Document_Management_SRS.md](file:///d:/Projects/CCS3/doc/Cloud_Based_Student_Document_Management_SRS.md) — Original Software Requirements Specification.
