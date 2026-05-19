# LMS & Academic Grading Engine

Schoolyard integrates a comprehensive **Learning Management System (LMS)** layer directly into the central database. This allows course enrollments, assignment grades, cumulative averages, dynamic GPAs, and published report cards to interact seamlessly.

---

## 📚 1. Courses, Sections & Student Enrollments

The academic catalog is built upon a three-tier relational structure:

```
┌──────────────────────────────────────┐
│ Course (e.g. Algebra II)             │
│ (Metadata, subject code, isArchived) │
└──────────────────┬───────────────────┘
                   │ (1-to-Many)
                   ▼
┌──────────────────────────────────────┐
│ Section (e.g. Algebra II - Block A)  │
│ (Term, assigned Teacher, Room, Schedule)│
└──────────────────┬───────────────────┘
                   │ (Many-to-Many via Enrollment join table)
                   ▼
┌──────────────────────────────────────┐
│ Student Profile                      │
└──────────────────────────────────────┘
```

* **`Course`**: The generic educational syllabus. It includes metadata, subject groupings, and an `isArchived` flag. Archiving a course hides it from registration screens while fully preserving historical gradebook and enrollment logs.
* **`Section`**: A live class scheduled within a specific `Term`. It defines a unique teaching slot, is assigned a primary `Teacher`, and holds list records of assignments and grades.
* **`Enrollment`**: The join record mapping students to sections, containing a status tracker (`ENROLLED`, `WITHDRAWN`). This allows auditing history if a student changes classes mid-semester.

---

## 📊 2. Grading Structure & Weighting Schemas

Schoolyard supports flexible, category-based weighted grading systems designed to match standard high-school gradebooks.

### Assignment Categories
Every assignment added to a Section is mapped to a specific type with default configurations:
* **`HOMEWORK`**: Standard formative practice tasks.
* **`QUIZ`**: Secondary, intermediate assessments.
* **`TEST`**: Major, summative unit assessments.

### Calculations Framework
Sections can compute grades using one of two methods, governed by section settings:
1. **Total Points Method**: Cumulative earned points divided by cumulative possible points:
   $$\text{Grade Percentage} = \frac{\sum \text{Earned Scores}}{\sum \text{Max Assignment Scores}} \times 100$$
2. **Weighted Categories Method**: Each assignment category is mapped to a percentage weight (e.g., Homework: 20%, Quizzes: 30%, Tests: 50%). The average for each category is calculated first, and then the overall grade is compiled:
   $$\text{Overall Grade} = \sum \left( \text{Category Average} \times \text{Category Weight} \right)$$

---

## 🧮 3. High-Performance Functional GPA Engine

To safeguard the application from hydration mismatches, sluggish dashboard page loads, and database load peaks, Schoolyard processes and summarizes GPAs using **pure, stateless, functional operations** instead of heavy database triggers or mutative state loops.

### The Pure Reduce Pattern
Our student GPA aggregation engine calculates scores dynamically during client/server render streams without modifying external states:

```typescript
// 1. Fetch active enrollments with their linked section assignments and grades
const activeEnrollments = student.enrollments.filter(e => e.status === "ENROLLED")

// 2. Map enrollments to category scores, safely catching ungraded modules
const coursesProgress = activeEnrollments.map(enr => {
  const assignments = enr.section.assignments
  let earned = 0
  let possible = 0

  assignments.forEach(a => {
    const grade = a.grades[0] // Student's score
    if (grade && a.maxScore) {
      earned += grade.score
      possible += a.maxScore
    }
  })

  const percentage = possible > 0 ? (earned / possible) * 100 : null

  return {
    courseName: enr.section.course.name,
    percentage
  }
})

// 3. Filter graded items and safely aggregate using a functional reduce accumulator
const gradedCourses = coursesProgress.filter(cp => cp.percentage !== null)
const coursesWithGrades = gradedCourses.length

const totalGradeSum = gradedCourses.reduce((sum, cp) => sum + (cp.percentage ?? 0), 0)

// 4. Calculate final GPA with division-by-zero protection
const overallGPA = coursesWithGrades > 0 
  ? (totalGradeSum / coursesWithGrades).toFixed(1) 
  : "N/A"
```

### Safety Features
* **Division-by-Zero Protection**: If a student is enrolled in courses but no grades have been inputted yet, `coursesWithGrades` equals `0`. The ternary check prevents `NaN` or `Infinity` calculations, safely outputting `"N/A"`.
* **Null Check Protections**: Ungraded course components are resolved to `null` and explicitly bypassed in accumulator calculations, preventing UI crashes or skewed score metrics.

---

## 📄 4. Published Report Cards & Transcripts

At the end of an academic term, schools can compile, publish, and distribute formal grade reports.

```
[Administrators: Close Term] ──► [Generate Report Cards] ──► [Publish to PWA Hub]
                                                                     │
                                                                     ▼
                                                          [Parent/Student Download PDF]
```

### The Publishing Pipeline
1. **Closing a Term**: Administrators lock modifications inside the active `Term`.
2. **Batch Generation**: The system batch-processes every student's functional overall grade averages across all active section enrollments, generating a immutable `ReportCard` database record.
3. **Teacher Feedback**: Section teachers add custom term narratives, summaries, and behavioral remarks to the record.
4. **Publish Trigger**: Once validated, administrators set `isPublished: true`. This immediately makes the report card visible inside the Parent and Student portals.
5. **Printable PDF Export**: The dashboard includes a print layout stylesheet. When parents or students click **"Download Report Card"**, the page prints cleanly as a professional, field-ready PDF document, omitting web-only interface elements (like sidebar navigation or profile headers) automatically.
