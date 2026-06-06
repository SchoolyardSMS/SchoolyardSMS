"use client"

import * as React from "react"
import { searchUsers } from "@/app/actions/user"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Check, ChevronsUpDown, Search, User as UserIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface UserSearchProps {
  onSelect: (user: any) => void
  userRole?: "STUDENT" | "TEACHER" | "PARENT" | "ADMIN" | "STAFF"
  placeholder?: string
  className?: string
}

export function UserSearch({ onSelect, userRole, placeholder = "Search for a user...", className }: UserSearchProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(false)

  const handleSearch = React.useCallback(async (val: string) => {
    setQuery(val)
    if (val.length < 2) {
      setResults([])
      return
    }
    setLoading(true)
    try {
      const res = await searchUsers(val, { role: userRole })
      setResults(res)
    } catch (err) {
      console.error("Search error:", err)
    } finally {
      setLoading(false)
    }
  }, [userRole])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls="user-search-popup"
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate text-muted-foreground">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            {placeholder}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </button>
      } />
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput 
            placeholder="Type to search..." 
            value={query} 
            onValueChange={handleSearch}
          />
          <CommandList>
            {loading && <CommandEmpty>Searching...</CommandEmpty>}
            {!loading && results.length === 0 && query.length >= 2 && (
              <CommandEmpty>No users found.</CommandEmpty>
            )}
            {!loading && query.length < 2 && (
              <CommandEmpty>Type at least 2 characters to search.</CommandEmpty>
            )}
            <CommandGroup>
              {results.map((user) => (
                <CommandItem
                  key={user.id}
                  value={user.id}
                  onSelect={() => {
                    onSelect(user)
                    setOpen(false)
                    setQuery("")
                    setResults([])
                  }}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <UserIcon className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-medium">{user.name}</span>
                      <span className="text-xs text-muted-foreground">{user.email}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.grade && <Badge variant="outline" className="text-[10px]">Grade {user.grade}</Badge>}
                    <Badge variant="secondary" className="text-[10px]">{user.role}</Badge>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
