import cython
from pydantic import field_validator

from app.lib.naturalsize import naturalsize
from app.limits import ELEMENT_TAGS_KEY_MAX_LENGTH, ELEMENT_TAGS_LIMIT, ELEMENT_TAGS_MAX_SIZE
from app.models.db.base import Base
from app.models.str import TagKeyStr, TagValueStr

_min_tags_len_to_exceed_size = ELEMENT_TAGS_MAX_SIZE / (ELEMENT_TAGS_KEY_MAX_LENGTH + 255)


class TagsValidating(Base.Validating):
    # TODO: test
    tags: dict[TagKeyStr, TagValueStr]

    # TODO: test
    @field_validator('tags')
    @classmethod
    def validate_tags(cls, tags: dict) -> dict:
        tags_len = len(tags)

        if tags_len > ELEMENT_TAGS_LIMIT:
            raise ValueError(f'Element cannot have more than {ELEMENT_TAGS_LIMIT} tags')
        if tags_len > _min_tags_len_to_exceed_size:
            size: cython.int = 0
            for key, value in tags.items():
                size += len(key) + len(value)
                if size > ELEMENT_TAGS_MAX_SIZE:
                    raise ValueError(f'Element tags size cannot exceed {naturalsize(ELEMENT_TAGS_MAX_SIZE)}')

        return tags
