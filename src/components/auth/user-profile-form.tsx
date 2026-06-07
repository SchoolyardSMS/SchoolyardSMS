"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { toast } from "sonner"
import { updateUserProfile } from "@/app/actions/user"

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.email({ message: "Please enter a valid email address." }),
})

export function UserProfileForm({ initialData }: { initialData: { id: string, name: string, email: string, role: string } }) {
  const [isLoading, setIsLoading] = useState(false)

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: initialData.name,
      email: initialData.email,
    },
  })

  async function onSubmit(values: z.infer<typeof profileSchema>) {
    setIsLoading(true)
    const result = await updateUserProfile(values)
    
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success("Profile updated successfully")
    }
    
    setIsLoading(false)
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email Address</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormItem>
            <FormLabel>Account Role</FormLabel>
            <FormControl>
              <Input value={initialData.role} disabled className="bg-slate-50 text-slate-500 font-semibold" />
            </FormControl>
            <FormMessage />
          </FormItem>
        </div>
        
        <div className="pt-4 flex justify-end border-t border-slate-200 dark:border-slate-800">
          <Button type="submit" disabled={isLoading} className="px-8">
            {isLoading ? "Saving changes..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </Form>
  )
}
