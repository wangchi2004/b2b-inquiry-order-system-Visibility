import { processProductEmbeddings } from "@/lib/embeddings/worker";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) return Response.json({ error:"Unauthorized" },{ status:401 });
  try {
    const result = await processProductEmbeddings(10);
    return Response.json(result,{ status:result.configured && !result.failed ? 200 : 503 });
  } catch { return Response.json({ error:"Embedding task unavailable" },{ status:503 }); }
}
