import { redirect } from "next/navigation"

export default function Home() {
  // Directly pushing to dashboard page
  redirect("/dashboard")
}
