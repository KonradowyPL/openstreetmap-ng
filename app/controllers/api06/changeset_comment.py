from typing import Annotated

from fastapi import APIRouter, Form
from pydantic import PositiveInt

from app.format06 import Format06
from app.lib.auth_context import api_user
from app.limits import CHANGESET_COMMENT_BODY_MAX_LENGTH
from app.models.db.user import User
from app.models.scope import ExtendedScope, Scope
from app.services.changeset_comment_service import ChangesetCommentService

router = APIRouter()


@router.post('/changeset/{changeset_id:int}/subscribe')
async def changeset_subscribe(
    changeset_id: PositiveInt,
    _: Annotated[User, api_user(Scope.write_api)],
) -> dict:
    # TODO: update, fetch changeset
    changeset = await ChangesetCommentService.subscribe(changeset_id)
    return Format06.encode_changeset(changeset)


@router.post('/changeset/{changeset_id:int}/unsubscribe')
async def changeset_unsubscribe(
    changeset_id: PositiveInt,
    _: Annotated[User, api_user(Scope.write_api)],
) -> dict:
    # TODO: update, fetch changeset
    changeset = await ChangesetCommentService.unsubscribe(changeset_id)
    return Format06.encode_changeset(changeset)


@router.post('/changeset/{changeset_id:int}/comment')
async def changeset_comment(
    changeset_id: PositiveInt,
    text: Annotated[str, Form(min_length=1, max_length=CHANGESET_COMMENT_BODY_MAX_LENGTH)],
    _: Annotated[User, api_user(Scope.write_api)],
) -> dict:
    # TODO: update, fetch changeset
    changeset = await ChangesetCommentService.comment(changeset_id, text)
    return Format06.encode_changeset(changeset)


@router.post('/changeset/comment/{comment_id:int}/hide')
async def changeset_comment_hide(
    comment_id: PositiveInt,
    _: Annotated[User, api_user(Scope.write_api, ExtendedScope.role_moderator)],
) -> dict:
    # TODO: update, fetch changeset
    changeset = await ChangesetCommentService.delete_comment_unsafe(comment_id)
    return Format06.encode_changeset(changeset)