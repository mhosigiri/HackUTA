import os
from typing import Optional, Dict
import jwt
# Caching the JWKS client so we don't re-download keys each request
from functools import lru_cache
from jwt import PyJWKClient
from dotenv import load_dotenv

load_dotenv()

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE")
ALGORITHMS = ["RS256"]


@lru_cache(maxsize=1)
def get_jwks_client():
    return PyJWKClient(f"https://{AUTH0_DOMAIN}/.well-known/jwks.json")

def verify_token(token: str) -> Optional[Dict]:
    """
    Verify Auth0 JWT token
    """
    try:
        # Get the public key from Auth0
        jwks_client = get_jwks_client()

        # Get signing key
        signing_key = jwks_client.get_signing_key_from_jwt(token)

        # Decode and verify the token
        # Skip audience validation if using Management API or not configured
        if AUTH0_AUDIENCE and not AUTH0_AUDIENCE.endswith("/api/v2/"):
            # Validate audience if properly configured
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=ALGORITHMS,
                audience=AUTH0_AUDIENCE,
                issuer=f"https://{AUTH0_DOMAIN}/"
            )
        else:
            # Skip audience validation for now
            payload = jwt.decode(
                token,
                signing_key.key,
                algorithms=ALGORITHMS,
                issuer=f"https://{AUTH0_DOMAIN}/",
                options={"verify_aud": False}
            )

        return payload
    except jwt.ExpiredSignatureError:
        # Token expired
        return None
    except jwt.InvalidTokenError:
        # Any token validation/claims error (audience/issuer/signature/format)
        return None
    except Exception as e:
        # Fallback for unexpected errors
        return None
