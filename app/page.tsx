import { redirect } from "next/navigation";
import Scheduler from "@/components/Scheduler";
import { isAuthenticated } from "@/lib/auth";

export default async function HomePage() {
  if (!(await isAuthenticated())) redirect("/login");
  return <Scheduler mockMode={process.env.MOCK_X === "true"} />;
}
