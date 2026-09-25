import { redirect } from "next/navigation";
import { featuredSlug } from "@/lib/featured";

/** /live opens Sellvane's own capped test token. */
export default function LiveIndex() {
  redirect(`/live/${featuredSlug()}`);
}
