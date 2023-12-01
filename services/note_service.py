from fastapi import Request
from shapely import Point
from sqlalchemy import func, null, select
from sqlalchemy.orm import joinedload

from db import DB
from lib.auth import auth_user
from lib.exceptions import raise_for
from models.db.note import Note
from models.db.note_comment import NoteComment
from models.note_event import NoteEvent


class NoteService:
    @staticmethod
    async def create(request: Request, point: Point, text: str) -> Note:
        """
        Create a note.
        """

        if user := auth_user():
            user_id = user.id
            user_ip = None
        else:
            user_id = None
            user_ip = request.client.host

        async with DB() as session, session.begin():
            note = Note(
                point=point,
                note_comments=[
                    NoteComment(
                        user_id=user_id,
                        user_ip=user_ip,
                        event=NoteEvent.opened,
                        body=text,
                    )
                ],
            )

            session.add(note)

        return note

    @staticmethod
    async def comment(note_id: int, text: str, event: NoteEvent) -> Note:
        """
        Comment on a note.
        """

        async with DB() as session, session.begin():
            stmt = (
                select(Note)
                .options(joinedload(Note.note_comments))
                .where(
                    Note.id == note_id,
                )
                .with_for_update()
            )

            # only show hidden notes to moderators
            if not (user := auth_user()) or not user.is_moderator:
                stmt = stmt.where(Note.hidden_at == null())

            note = await session.scalar(stmt)

            if not note:
                raise_for().note_not_found(note_id)

            if event == NoteEvent.closed:
                if note.closed_at:
                    raise_for().note_closed(note_id, note.closed_at)

                note.closed_at = func.now()

            elif event == NoteEvent.reopened:
                # unhide
                if note.hidden_at:
                    note.hidden_at = None
                # reopen
                else:
                    if not note.closed_at:
                        raise_for().note_open(note_id)

                    note.closed_at = None

            elif event == NoteEvent.commented:
                if note.closed_at:
                    raise_for().note_closed(note_id, note.closed_at)

            elif event == NoteEvent.hidden:
                note.hidden_at = func.now()

            else:
                raise RuntimeError(f'Unsupported comment event: {event!r}')

            # TODO: will this updated_at ?
            note.note_comments.append(
                NoteComment(
                    user_id=user.id,
                    user_ip=None,
                    event=event,
                    body=text,
                )
            )

        return note