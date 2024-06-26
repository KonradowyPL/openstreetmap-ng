from starlette.types import ASGIApp, Receive, Scope, Send

from app.lib.format_style_context import format_style_context
from app.middlewares.request_context_middleware import get_request


class FormatStyleMiddleware:
    """
    Wrap requests in format style context.
    """

    __slots__ = ('app',)

    def __init__(self, app: ASGIApp) -> None:
        self.app = app

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope['type'] != 'http':
            await self.app(scope, receive, send)
            return

        request = get_request()
        with format_style_context(request):
            await self.app(scope, receive, send)
