import { db } from "@/lib/db"

export interface HierarchicalTerm {
  id: string
  schoolYearId: string
  name: string
  type: string
  parentId: string | null
  startDate: Date
  endDate: Date
  depth: number
  displayName: string
  schoolYear?: {
    name: string
  }
}

export function sortTermsHierarchically(terms: any[]): HierarchicalTerm[] {
  const sorted: HierarchicalTerm[] = []

  const collectChildren = (parentId: string, depth: number) => {
    const children = terms.filter(t => t.parentId === parentId)
    children.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
    for (const child of children) {
      const indent = "— ".repeat(depth)
      sorted.push({
        ...child,
        depth,
        displayName: `${indent}${child.name}`
      })
      collectChildren(child.id, depth + 1)
    }
  }

  const rootTerms = terms.filter(t => !t.parentId)
  rootTerms.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())

  for (const root of rootTerms) {
    sorted.push({
      ...root,
      depth: 0,
      displayName: root.name
    })
    collectChildren(root.id, 1)
  }

  return sorted
}

export async function getActiveSchoolYearTerms(): Promise<HierarchicalTerm[]> {
  const activeYear = await db.schoolYear.findFirst({
    where: { isActive: true },
    include: {
      terms: {
        include: {
          schoolYear: true
        }
      }
    }
  })

  if (!activeYear) return []
  return sortTermsHierarchically(activeYear.terms)
}
