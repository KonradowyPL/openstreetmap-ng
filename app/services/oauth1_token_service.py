from collections.abc import Sequence

from sqlalchemy import func, null, select

from app.db import db_commit
from app.lib.auth_context import auth_user
from app.lib.buffered_random import buffered_rand_urlsafe
from app.lib.crypto import hash_bytes
from app.lib.exceptions_context import raise_for
from app.models.db.oauth1_token import OAuth1Token
from app.models.scope import Scope
from app.queries.oauth1_application_query import OAuth1ApplicationQuery
from app.utils import extend_query_params
from app.validators.url import URLValidator


class OAuth1TokenService:
    @staticmethod
    async def request_token(consumer_key: str, callback_url_param: str | None) -> dict:
        """
        Create a new request token.

        At this stage, the token only references the application.
        """
        app = await OAuth1ApplicationQuery.find_by_consumer_key(consumer_key)
        if app is None:
            raise_for().oauth_bad_app_token()

        token_str = buffered_rand_urlsafe(32)
        token_hashed = hash_bytes(token_str)
        token_secret = buffered_rand_urlsafe(32)
        callback_url = callback_url_param or app.callback_url

        # oob requests don't contain a callback url
        if (callback_url is not None) and callback_url[:3].lower() == 'oob':
            callback_url = None

        # validate the callback url
        if callback_url is not None:
            try:
                URLValidator.validate(callback_url)
            except Exception:
                raise_for().oauth_bad_redirect_uri()

        async with db_commit() as session:
            session.add(
                OAuth1Token(
                    user_id=None,
                    application_id=app.id,
                    token_hashed=token_hashed,
                    token_secret=token_secret,
                    scopes=[],
                    callback_url=callback_url,
                    verifier=None,
                )
            )

        result = {
            'oauth_token': token_str,
            'oauth_token_secret': token_secret,
        }

        # confirm the callback_url_param as required by oauth1.0a
        if callback_url_param:
            result['oauth_callback_confirmed'] = 'true'

        return result

    @staticmethod
    async def authorize(token_str: str, scopes: Sequence[Scope]) -> str:
        """
        Authorize a request token for a user.

        The token is updated to reference the user and the given scopes.

        The returned verifier must be used to exchange the request token for a valid access token.

        Returns either a redirect url or a verifier code (prefixed with "oob;").
        """
        token_hashed = hash_bytes(token_str)

        async with db_commit() as session:
            stmt = (
                select(OAuth1Token)
                .where(
                    OAuth1Token.token_hashed == token_hashed,
                    OAuth1Token.user_id == null(),
                )
                .with_for_update()
            )

            token = await session.scalar(stmt)
            if token is None:
                raise_for().oauth_bad_user_token()
            if not set(scopes).issubset(token.application.scopes):
                raise_for().oauth_bad_scopes()

            verifier = buffered_rand_urlsafe(32)

            token.user_id = auth_user().id
            token.scopes = scopes
            token.verifier = verifier

        if token.is_oob:
            return f'oob;{verifier}'

        params = {
            'oauth_token': token_str,
            'oauth_verifier': verifier,
        }

        return extend_query_params(token.callback_url, params)

    @staticmethod
    async def access_token(token_str: str, verifier: str) -> dict:
        """
        Exchange a request token for an access token.

        The access token can be used to make requests on behalf of the user.
        """
        token_hashed = hash_bytes(token_str)

        async with db_commit() as session:
            stmt = (
                select(OAuth1Token)
                .where(
                    OAuth1Token.token_hashed == token_hashed,
                    OAuth1Token.user_id != null(),
                    OAuth1Token.authorized_at == null(),
                )
                .with_for_update()
            )

            token = await session.scalar(stmt)
            if token is None:
                raise_for().oauth_bad_user_token()

            try:
                if token.verifier != verifier:
                    raise_for().oauth1_bad_verifier()
            except Exception:
                # delete the token if the verification fails
                await session.delete(token)
                raise

            token_str = buffered_rand_urlsafe(32)
            token_hashed = hash_bytes(token_str)
            token_secret = buffered_rand_urlsafe(32)

            token.token_hashed = token_hashed
            token.key_secret = token_secret
            token.authorized_at = func.statement_timestamp()
            token.verifier = None

        return {
            'oauth_token': token_str,
            'oauth_token_secret': token_secret,
        }
