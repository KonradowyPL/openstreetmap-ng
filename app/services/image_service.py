from app.lib.image import Image
from app.lib.storage import AVATAR_STORAGE, BACKGROUND_STORAGE
from app.models.types import StorageKey


class ImageService:
    @staticmethod
    async def upload_avatar(data: bytes) -> StorageKey:
        """Process upload of a custom avatar image. Returns the avatar id."""
        data = await Image.normalize_avatar(data)
        return await AVATAR_STORAGE.save(data, '.webp')

    @staticmethod
    async def delete_avatar_by_id(avatar_id: StorageKey) -> None:
        """Delete a custom avatar image by id."""
        await AVATAR_STORAGE.delete(avatar_id)

    @staticmethod
    async def upload_background(data: bytes) -> StorageKey:
        """Process upload of a custom background image. Returns the background id."""
        data = await Image.normalize_background(data)
        return await BACKGROUND_STORAGE.save(data, '.webp')

    @staticmethod
    async def delete_background_by_id(background_id: StorageKey) -> None:
        """Delete a custom background image by id."""
        await BACKGROUND_STORAGE.delete(background_id)
