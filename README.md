# 🏫 Schoolyard Student Information System (SIS)

[![Framework](https://img.shields.io/badge/Framework-Next.js%2016-black?style=for-the-badge&logo=next.js)](https://nextjs.org)
[![Runtime](https://img.shields.io/badge/Runtime-Bun-black?style=for-the-badge&logo=bun)](https://bun.sh)
[![Database](https://img.shields.io/badge/Database-PostgreSQL-blue?style=for-the-badge&logo=postgresql)](https://postgresql.org)
[![ORM](https://img.shields.io/badge/ORM-Prisma-teal?style=for-the-badge&logo=prisma)](https://prisma.io)
[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](https://opensource.org/licenses/MIT)

**Schoolyard** is a next-generation, high-performance, and beautifully designed Student Information System (SIS) and Learning Management System (LMS) built with Next.js, React, TailwindCSS, Prisma, and PostgreSQL. It delivers a modern, premium experience for school administrators, teachers, parents, and students.

---

## ✨ Features Overview

### 📚 Academics & Grading Systems
- **Flexible Gradebooks**: Full support for weighted assignment groups (Homework, Quizzes, Tests, Projects) and configurable letter grade scales.
- **Post Term Grades**: Teachers can review weighted averages, check against grading scales, and post final term grades with a single click inside an interactive grade assist drawer.
- **School-Wide Quarter Resets**: Admins can audit teacher submissions school-wide, inspect sections with missing grades, and securely archive assignments to reset active gradebooks for the new term.
- **Historic Snapshots**: Students, parents, and teachers can look back at read-only historic quarter/semester performance records.

### 🗓️ Terms & Academic Calendar
- **Recursive Term Hierarchy**: Setup semesters, quarters, or custom block systems recursively under school years.
- **Attendance Systems**: Complete Orah-inspired attendance tracking with statuses (Present, Tardy, Excused, Unexcused) and real-time dashboard stats.

### 💬 Unified Messaging Hub
- **Broadcast Streams**: Send school-wide announcements or specific class messages.
- **Email & Push Notifications**: Fully integrated with Resend for transactional emails, and browser push notifications for PWA alerts.

### 📱 PWA & Mobile Optimization
- **Offline Capabilities**: Full service-worker implementation allows the app to be added to mobile home-screens and handle offline situations gracefully.

---

## 🛠️ Technology Stack

- **Core Framework**: [Next.js (App Router)](https://nextjs.org)
- **Runtime Environment**: [Bun](https://bun.sh)
- **Database & ORM**: [PostgreSQL](https://www.postgresql.org/) & [Prisma ORM](https://www.prisma.io/)
- **UI Styling**: Tailwind CSS, Shadcn UI, Framer Motion
- **Icons**: Lucide React
- **Email Delivery**: [Resend](https://resend.com/)

---

## 🚀 Getting Started

### Prerequisites

Ensure you have **Bun** and **PostgreSQL** installed on your system.

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/schoolyard.git
cd SchoolyardSMS
```

### 2. Install Dependencies

Using **Bun** is highly recommended for faster builds and package resolution:

```bash
bun install
```

### 3. Setup Environment Variables

Copy the `.env.example` file and populate it with your database credentials:

```bash
cp .env.example .env
```

Open `.env` and configure your database and authentication secrets:

```env
DATABASE_URL="postgresql://username:password@localhost:5432/schoolyard?schema=public"
NEXTAUTH_SECRET="your-super-secret-random-key"
```

### 4. Database Setup & Seeding

Sync your database schema, apply Prisma migrations, and seed the initial administrative accounts and demo data:

```bash
# Push schema structure to PostgreSQL
bunx prisma db push

# Seed the database with terms, users, and administrative configurations
bun run prisma/seed.ts
```

### 5. Start the Development Server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to experience **Schoolyard**.

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
