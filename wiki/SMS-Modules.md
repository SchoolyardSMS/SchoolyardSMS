# SMS Core Modules: Terms, Attendance, Discipline & Flextime

The **Student Information System (SMS)** layer of Schoolyard handles the administrative foundation of the school, tracking academic schedules, student safety, daily attendance, disciplinary workflows, and community period registrations.

---

## 📅 1. Academic Term & Calendar Management

Schoolyard organizes school calendars around distinct, sequential **Terms** (e.g., "Fall 2026", "Spring 2027"). 

```
┌──────────────────────────────────────────────┐
│ Term: Fall 2026                              │
│ Boundary: Sep 1, 2026 — Dec 18, 2026         │
├──────────────────────────────────────────────┤
│  🟢 Active Term State                        │
│  📅 Off-Days: Nov 26, Nov 27 (Thanksgiving)  │
└──────────────────────────────────────────────┘
```

### Relational Schema (`Term`)
* **Date Boundaries**: Configured with strict start and end dates. The system prevents date boundary collisions or overlaps between multiple active terms.
* **IsActive Status Toggle**: Only one term can be set as the canonical `active` term at a time. Activating a term marks all others as inactive. This status controls default views for Gradebooks, Section enrollments, and Attendance rolls.
* **Off-Days Calendar Integration**: Administrators can define global "Off-Days" (e.g. holidays, teacher-service days). The attendance and scheduling modules query this list to bypass attendance rolls and calendar blocks on these dates, avoiding false absences.

---

## 📝 2. Dynamic Orah-Inspired Attendance Engine

Schoolyard implements a high-performance check-in and attendance tracker modeled after modern boarding-school safety systems like **Orah**.

### Tracking Matrix & Statuses
The attendance engine operates on a strict daily matrix where each student has an attendance check-in slot per session or day:
* **`PRESENT`**: Student is accounted for.
* **`ABSENT`**: Student is not present. This state flags a critical alert and triggers automated messaging.
* **`TARDY`**: Student arrived late. Logs the arrival timestamp for record audits.

### Notification Triggers & Workflows
When a teacher or administrator marks a student as `ABSENT` on the daily roll:
1. **Absence Log**: The database records an `Attendance` entry with `status: "ABSENT"`.
2. **Dynamic Alert Dispatch**: An automated server hook queues an outbound notification job to the student's registered `Parents`.
3. **Delivery Channels**: The background worker delivers this alert via email and PWA Push notification, stating the student's name, absence date, and requesting immediate verification.
4. **Attendance Rate Metrics**: Cumulative statistics are calculated in real time:
   $$\text{Attendance Rate} = \frac{\text{Present Count} + \text{Tardy Count}}{\text{Total School Days}} \times 100$$
   Rates falling below 90% are flagged as high-priority warnings in the student and administration dashboard directories.

---

## 🚨 3. Behavioral Log & Discipline Incident Suite

Schoolyard provides a robust incident logging tracker to help counselors, deans, and teachers handle and resolve behavioral concerns with full relational transparency.

```
                  ┌──────────────┐
                  │ Status: OPEN │
                  └──────┬───────┘
                         │ (Deans assign counselor)
                         ▼
           ┌────────────────────────────┐
           │ Status: INVESTIGATING      │
           └─────────────┬──────────────┘
                         │ (Resolution, parent meeting)
                         ▼
                 ┌──────────────┐
                 │ Status: CLOSED│
                 └──────────────┘
```

### Key Incident Fields
* **`severity`**: Categorized as `LOW` (minor disruption), `MEDIUM` (dress code, minor cell phone violation), or `HIGH` (physical altercation, academic dishonesty).
* **`status`**: Governs progress through the resolution pipeline (`OPEN`, `INVESTIGATING`, `CLOSED`).
* **`points`**: A numeric value assigned per incident to track cumulative behavioral trends (often used to manage points systems or detentions).

### Transition & Resolution Rules
* **Logging**: Teachers or deans can submit a report. Submitting a `HIGH` severity incident immediately dispatches automated alerts to administrators and registers a behavioral flag on the student's dashboard.
* **Resolution**: An incident can only be transitioned to `CLOSED` by an administrator (`ADMIN`) after logging formal resolution notes and documenting parental check-ins, ensuring full administrative accountability.

---

## 🏫 4. Flextime Community Period Registration

Inspired by modern flexible-scheduling software like **Flextime Manager**, Schoolyard's **Community Period** module allows schools to utilize extracurricular slots or study halls dynamically.

### System Configuration
* **Bell Schedules**: Administrators declare periodic "Community Periods" throughout the week.
* **Session Ownership**: Teachers design and publish custom activities for these slots (e.g. "Chess Club", "AP Chemistry Study Hall", "Outdoor Track").
* **Occupancy & Room Caps**: Each activity is mapped to a specific classroom and enforces a strict occupancy limit (e.g. 20 seats) to comply with fire codes.

### Enrollment Actions & Overrides
* **Student Self-Enrollment**: During active registration windows, students can log into their dashboard, browse available sessions, and enroll in their choice, provided the room's seat cap has not been reached.
* **Teacher/Admin Overrides**: Teachers or administrators can enforce "Required Enrollments" (analogous to a teacher lock-in). If a student is failing a course, a teacher can force-enroll them into a remedial study hall, overriding student choice and locking the slot to prevent the student from selecting other activities.
* **Attendance Tracking**: Just like standard classes, session owners can run attendance rolls directly for their specific community period session, logging records into the daily safety dashboard.
