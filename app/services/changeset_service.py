import asyncio
import logging
import random
from asyncio import Event, TaskGroup
from contextlib import asynccontextmanager
from datetime import datetime
from time import perf_counter

from psycopg import AsyncConnection
from sentry_sdk.api import start_transaction

from app.config import SENTRY_CHANGESET_MANAGEMENT_MONITOR, TEST_ENV
from app.db import db
from app.lib.auth_context import auth_user
from app.lib.exceptions_context import raise_for
from app.lib.retry import retry
from app.lib.testmethod import testmethod
from app.limits import CHANGESET_EMPTY_DELETE_TIMEOUT, CHANGESET_IDLE_TIMEOUT, CHANGESET_OPEN_TIMEOUT
from app.models.db.changeset import ChangesetInit
from app.models.types import ChangesetId, UserId
from app.services.user_subscription_service import UserSubscriptionService

_PROCESS_REQUEST_EVENT = Event()
_PROCESS_DONE_EVENT = Event()


class ChangesetService:
    @staticmethod
    async def create(tags: dict[str, str]) -> ChangesetId:
        """Create a new changeset and return its id."""
        user_id = auth_user(required=True)['id']

        changeset_init: ChangesetInit = {
            'user_id': user_id,
            'tags': tags,
        }

        async with (
            db(True) as conn,
            await conn.execute(
                """
                INSERT INTO changeset (
                    user_id, tags
                )
                VALUES (
                    %(user_id)s, %(tags)s
                )
                RETURNING id
                """,
                changeset_init,
            ) as r,
        ):
            changeset_id: ChangesetId = (await r.fetchone())[0]  # type: ignore

        logging.debug('Created changeset %d by user %d', changeset_id, user_id)
        await UserSubscriptionService.subscribe('changeset', changeset_id)
        return changeset_id

    @staticmethod
    async def update_tags(changeset_id: ChangesetId, tags: dict[str, str]) -> None:
        """Update changeset tags."""
        user_id = auth_user(required=True)['id']

        async with db(True) as conn:
            async with await conn.execute(
                """
                SELECT user_id, closed_at
                FROM changeset
                WHERE id = %s
                FOR UPDATE
                """,
                (changeset_id,),
            ) as r:
                row = await r.fetchone()
                if row is None:
                    raise_for.changeset_not_found(changeset_id)

                changeset_user_id: UserId
                closed_at: datetime | None
                changeset_user_id, closed_at = row

                if changeset_user_id != user_id:
                    raise_for.changeset_access_denied()
                if closed_at is not None:
                    raise_for.changeset_already_closed(changeset_id, closed_at)

            await conn.execute(
                """
                UPDATE changeset
                SET tags = %s, updated_at = DEFAULT
                WHERE id = %s
                """,
                (tags, changeset_id),
            )

        logging.debug('Updated changeset tags for %d by user %d', changeset_id, user_id)

    @staticmethod
    async def close(changeset_id: ChangesetId) -> None:
        """Close a changeset."""
        user_id = auth_user(required=True)['id']

        async with db(True) as conn:
            async with await conn.execute(
                """
                SELECT user_id, closed_at
                FROM changeset
                WHERE id = %s
                FOR UPDATE
                """,
                (changeset_id,),
            ) as r:
                row = await r.fetchone()
                if row is None:
                    raise_for.changeset_not_found(changeset_id)

                changeset_user_id: UserId
                closed_at: datetime | None
                changeset_user_id, closed_at = row

                if changeset_user_id != user_id:
                    raise_for.changeset_access_denied()
                if closed_at is not None:
                    raise_for.changeset_already_closed(changeset_id, closed_at)

            await conn.execute(
                """
                UPDATE changeset
                SET closed_at = statement_timestamp(), updated_at = DEFAULT
                WHERE id = %s
                """,
                (changeset_id,),
            )

        logging.debug('Closed changeset %d by user %d', changeset_id, user_id)

    @staticmethod
    @asynccontextmanager
    async def context():
        """Context manager for closing idle changesets."""
        async with TaskGroup() as tg:
            task = tg.create_task(_process_task())
            yield
            task.cancel()  # avoid "Task was destroyed" warning during tests

    @staticmethod
    @testmethod
    async def force_process():
        """
        Force the changeset processing loop to wake up early, and wait for it to finish.
        This method is only available during testing, and is limited to the current process.
        """
        logging.debug('Requesting changeset processing loop early wakeup')
        _PROCESS_REQUEST_EVENT.set()
        _PROCESS_DONE_EVENT.clear()
        await _PROCESS_DONE_EVENT.wait()


@retry(None)
async def _process_task() -> None:
    while True:
        async with db(True, autocommit=True) as conn:
            # Lock is just a random unique number
            async with await conn.execute('SELECT pg_try_advisory_xact_lock(6978403057152160935::bigint)') as r:
                acquired: bool = (await r.fetchone())[0]  # type: ignore

            if acquired:
                ts = perf_counter()
                with SENTRY_CHANGESET_MANAGEMENT_MONITOR, start_transaction(op='task', name='changeset-management'):
                    await _close_inactive(conn)
                    await _delete_empty(conn)
                tt = perf_counter() - ts

                # on success, sleep ~1min
                delay = random.uniform(50, 70) - tt
            else:
                # on failure, sleep ~1h
                delay = random.uniform(1800, 5400)

        if not TEST_ENV:
            await asyncio.sleep(delay)
            continue

        # Test environment supports early wakeup
        _PROCESS_DONE_EVENT.set()
        async with TaskGroup() as tg:
            event_task = tg.create_task(_PROCESS_REQUEST_EVENT.wait())
            await asyncio.wait((event_task,), timeout=delay)
            if event_task.done():
                logging.debug('Changeset processing loop early wakeup')
                _PROCESS_REQUEST_EVENT.clear()
            else:
                event_task.cancel()


async def _close_inactive(conn: AsyncConnection) -> None:
    """Close all inactive changesets."""
    result = await conn.execute(
        """
        UPDATE changeset
        SET closed_at = statement_timestamp(), updated_at = DEFAULT
        WHERE closed_at IS NULL AND (
            updated_at < statement_timestamp() - %s OR
            (updated_at >= statement_timestamp() - %s AND
             created_at < statement_timestamp() - %s)
        )
        """,
        (CHANGESET_IDLE_TIMEOUT, CHANGESET_IDLE_TIMEOUT, CHANGESET_OPEN_TIMEOUT),
    )

    if result.rowcount:
        logging.debug('Closed %d inactive changesets', result.rowcount)


async def _delete_empty(conn: AsyncConnection) -> None:
    """Delete empty changesets after a timeout."""
    async with conn.transaction():
        # The delete query tends to use a slow seqscan, probably because of skewed statistics.
        # Force disabling seqscan to prefer using our custom index.
        await conn.execute('SET LOCAL enable_seqscan = off')

        result = await conn.execute(
            """
            DELETE FROM changeset
            WHERE closed_at IS NOT NULL
            AND closed_at < statement_timestamp() - %s
            AND size = 0
            """,
            (CHANGESET_EMPTY_DELETE_TIMEOUT,),
        )

        if result.rowcount:
            logging.debug('Deleted %d empty changesets', result.rowcount)
