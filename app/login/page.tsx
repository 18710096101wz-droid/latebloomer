import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { isAuthenticated } from "@/lib/auth";

export default async function LoginPage() {
  if (await isAuthenticated()) redirect("/");
  return (
    <main className="loginWrap">
      <LoginForm />
    </main>
  );
}
