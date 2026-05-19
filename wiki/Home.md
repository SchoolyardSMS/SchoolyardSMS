# Schoolyard SMS + LMS Platform Wiki

Welcome to the **Schoolyard** Platform Wiki. Schoolyard is a production-grade, state-of-the-art administrative portal designed for schools to bridge the gap between a **Student Information System (SMS)** and a **Learning Management System (LMS)**. 

Built as a lightweight, lightning-fast **Progressive Web App (PWA)**, Schoolyard gives administrators, teachers, students, and parents a single, real-time interface to manage academic terms, dynamic gradebooks, attendance check-ins, behavioral incidents, and broadcast communications.

---

## 🧭 Documentation Portal Index

Explore the comprehensive technical and operational manuals of Schoolyard:

* **[Architecture & Tech Stack](Architecture-and-Tech-Stack.md)**: Server actions, Prisma relational schema, BullMQ messaging dispatches, and code structural layouts.
* **[SMS Core Modules](SMS-Modules.md)**: Academic terms progression, Orah-inspired attendance tracking, disciplinary incident lifecycles, and Flextime-style Community Period registrations.
* **[LMS & Grading Engine](LMS-and-Grading-Engine.md)**: Course enrollments, weighted gradebook metrics, functional high-performance GPA calculators, and printable PDF report cards/transcripts.
* **[Messaging & Notifications Hub](Messaging-and-Notification-Hub.md)**: Scale-optimized broadcasts (`BroadcastDelivery`), Resend batch email delivery, custom PWA service workers, and Web Push notifications.
* **[Developer & Hardening Guide](Developer-Guide.md)**: Quickstart instructions for local setup, Bun tooling, database migrations, Vitest suites, and lint checks.

---

## 🛠️ Modular Feature Grid

| Module | Purpose | Core Features |
| :--- | :--- | :--- |
| **SMS Infrastructure** | School management & terms | Calendar term scheduling, school branding, custom color palettes, and global configuration toggles. |
| **Attendance Engine** | Dynamic status check-ins | Real-time rolls, dynamic statuses (PRESENT, ABSENT, TARDY), parent notifications, and cumulative attendance rates. |
| **Discipline Logging** | Incident reporting & lifecycles | Behavioral logging, severity tracking, multi-stage status workflows, and automated parent alerts. |
| **Community Periods** | Extracurricular flextime | Teacher-designed session registration, occupancy limits, student enrollment, and attendance. |
| **Academics & LMS** | Gradebooks & course progress | Student section enrollments, weighted categories, dynamic assignments, and teacher grading views. |
| **Grading & Reporting** | Transcripts & report cards | High-performance overall GPA reduce calculators, report card generation, and printable PDF exports. |
| **Communications** | Mass broadcast & notifications | Scale-optimized broad messaging, batch mailing, background BullMQ workers, and PWA Web Push notifications. |

---

## 🔐 User Role & Permission Matrix

Schoolyard enforces strict, granular **Role-Based Access Control (RBAC)** across four default roles:

| Action / Permission | Administrator (`ADMIN`) | Teacher (`TEACHER`) | Student (`STUDENT`) | Parent (`PARENT`) |
| :--- | :---: | :---: | :---: | :---: |
| **Manage Global School Settings** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Import Users & CSV Data** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Manage Academic Terms & Calendar** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Create/Edit Courses & Sections** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Create/Edit Assignments** | ✅ Yes | ✅ Yes (Assigned Sections) | ❌ No | ❌ No |
| **Input Grades & Modify Scores** | ✅ Yes | ✅ Yes (Assigned Sections) | ❌ No | ❌ No |
| **Log Disciplinary Incidents** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **Resolve & Close Disciplinary Incidents** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Publish Term Report Cards** | ✅ Yes | ❌ No | ❌ No | ❌ No |
| **Download Report Cards & Transcripts** | ✅ Yes | ✅ Yes (All Students) | 👤 Self Only | 👤 Children Only |
| **Manage Community Period Sessions** | ✅ Yes | ✅ Yes (Session Owner) | ❌ No | ❌ No |
| **Enroll Students in Flextime Activities** | ✅ Yes | ✅ Yes (Teacher Override) | 👤 Self-Enroll | ❌ No |
| **Send Mass Broadcast Announcements** | ✅ Yes | ✅ Yes | ❌ No | ❌ No |
| **View Emergency Contacts & Health Details** | ✅ Yes | ✅ Yes (All Students) | 👤 Self Only | 👤 Children Only |
| **Modify Emergency Contacts & Health Details**| ✅ Yes | ❌ No | 👤 Self-Edit | 👤 Self-Edit |

---

## 📈 Platform Goals

* **Single Source of Truth**: Eliminate data silo fragmentation by connecting course performance directly with attendance, behavioral, and term reporting engines under a single unified schema.
* **Extreme Performance & Efficiency**: Deliver sub-100ms render frames, using lazy-loaded server-side actions, functional database aggregations, and background queue workers.
* **Modern Mobile-First Design**: Provide an elegant, premium user interface with dynamic dark mode, custom school-preset color profiles, and PWA offline capabilities.
* **Uncompromising Security**: Safeguard sensitive student health, academic, and behavioral records behind end-to-end cryptographic and RBAC checks.
