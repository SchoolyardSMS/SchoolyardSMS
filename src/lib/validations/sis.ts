import * as z from "zod"

export const DemographicUpdateSchema = z.object({
  dateOfBirth: z.string().or(z.date()).transform(val => new Date(val)),
  gradeLevel: z.number().int().min(-2).max(12), // -2 for Pre-K, -1 for K, 0-12
})

export const HealthUpdateSchema = z.object({
  medicalAlerts: z.string().nullable().optional(),
  accommodations: z.string().nullable().optional(),
})

export const TermGradeUpdateSchema = z.object({
  overrideScore: z.number().min(0).max(120).nullable().optional(),
  letterGrade: z.string().max(5).nullable().optional(),
  comments: z.string().max(2000).nullable().optional(),
})
