import { redirect } from "next/navigation";
import { requireAccount } from "@/lib/accountSession";
export default async function SampleCatalogPage() {
  await requireAccount("en");
  redirect("/en/catalog");
}
