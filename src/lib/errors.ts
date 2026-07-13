import { NextResponse } from "next/server";
import { ZodError } from "zod";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = "Authentication required") {
    super(401, message);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = "You do not have permission to perform this action") {
    super(403, message);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = "Not found") {
    super(404, message);
  }
}

export class ConflictError extends ApiError {
  constructor(message = "Conflict") {
    super(409, message);
  }
}

// Central error -> HTTP response mapping used by every API route handler.
export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  if (err instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: err.flatten().fieldErrors },
      { status: 400 },
    );
  }
  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
