export interface Session {
  organizationId: string;
  userId: string;
}

export async function getSession(_request: Request): Promise<Session | null> {
  return {
    organizationId: "org_fixture",
    userId: "user_fixture"
  };
}
