import { redirect } from "next/navigation";
import { hasSession } from "@/lib/auth";
import Workspace from "@/components/workspace";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  if (!(await hasSession())) redirect("/login");
  return <Workspace />;
}