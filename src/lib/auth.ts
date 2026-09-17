import { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "mie-level-super-secret-key-change-in-production-2026";

export interface AuthUser {
  id: number;
  email: string;
  nama: string;
  role: string;
}

/**
 * Extract authenticated user from JWT cookie.
 * Returns null if token is missing or invalid.
 * Uses the same jose library as middleware.ts for consistency.
 */
export async function getUserFromRequest(req: NextRequest): Promise<AuthUser | null> {
  const token = req.cookies.get("mie_level_token")?.value;
  if (!token) return null;

  try {
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    if (!payload.id || !payload.email || !payload.nama || !payload.role) {
      return null;
    }

    return {
      id: payload.id as number,
      email: payload.email as string,
      nama: payload.nama as string,
      role: payload.role as string,
    };
  } catch {
    return null;
  }
}
