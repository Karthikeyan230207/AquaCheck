from dataclasses import dataclass
from uuid import UUID

import httpx
from fastapi import Depends, Header, HTTPException, status

from app.config.settings import settings


@dataclass(frozen=True)
class AuthenticatedUser:
	user_id: str
	email: str | None


async def get_optional_user(
	authorization: str | None = Header(default=None),
) -> AuthenticatedUser | None:
	if authorization is None:
		return None
	if not authorization.startswith("Bearer "):
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="A valid bearer access token is required",
		)
	if not settings.supabase_url or not settings.supabase_key:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Authentication service is not configured",
		)

	token = authorization.removeprefix("Bearer ").strip()
	if not token:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="A valid bearer access token is required",
		)

	try:
		async with httpx.AsyncClient() as client:
			response = await client.get(
				f"{settings.supabase_url.rstrip('/')}/auth/v1/user",
				headers={
					"apikey": settings.supabase_key,
					"Authorization": f"Bearer {token}",
				},
			)
	except httpx.RequestError as error:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Authentication service is unavailable",
		) from error

	if response.status_code in {
		status.HTTP_400_BAD_REQUEST,
		status.HTTP_401_UNAUTHORIZED,
		status.HTTP_403_FORBIDDEN,
	}:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Access token is invalid or expired",
		)
	if response.is_error:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Authentication service could not verify the access token",
		)

	try:
		payload = response.json()
		user_id = str(UUID(payload["id"]))
		email = payload.get("email")
	except (KeyError, TypeError, ValueError) as error:
		raise HTTPException(
			status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
			detail="Authentication service returned an invalid user",
		) from error

	return AuthenticatedUser(user_id=user_id, email=email if isinstance(email, str) else None)


async def get_current_user(
	user: AuthenticatedUser | None = Depends(get_optional_user),
) -> AuthenticatedUser:
	if user is None:
		raise HTTPException(
			status_code=status.HTTP_401_UNAUTHORIZED,
			detail="Sign in to access saved reports",
		)
	return user
