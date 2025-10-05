import os
from typing import Optional, Dict
import jwt
# Caching the JWKS client so we don't re-download keys each request
from functools import lru_cache
from jwt import PyJWKClient
from dotenv import load_dotenv
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

AUTH0_DOMAIN = os.getenv("AUTH0_DOMAIN")
AUTH0_AUDIENCE = os.getenv("AUTH0_AUDIENCE") or os.getenv("AUTH0_API_AUDIENCE")
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
        payload = jwt.decode(
            token,
            signing_key.key,
            algorithms=ALGORITHMS,
            audience=AUTH0_AUDIENCE,
            issuer=f"https://{AUTH0_DOMAIN}/"
        )

        return payload
    except jwt.ExpiredSignatureError as e:
        logger.error(f"Token verification failed: ExpiredSignatureError - {e}")
        return None
    except jwt.InvalidTokenError as e:
        logger.error(f"Token verification failed: InvalidTokenError - {e}")
        return None
    except Exception as e:
        logger.error(f"An unexpected error occurred during token verification: {e}", exc_info=True)
        return None
