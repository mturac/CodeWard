import { getSession } from "../../../server/auth/session";

export async function POST(request: Request): Promise<Response> {
  const session = await getSession(request);
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  return Response.json({ ok: true });
}
