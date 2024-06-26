from collections.abc import Sequence
from contextlib import contextmanager
from contextvars import ContextVar
from functools import lru_cache
from gettext import GNUTranslations, translation

from app.config import DEFAULT_LANGUAGE, LOCALE_DIR
from app.lib.locale import is_valid_locale

_locale_dir = LOCALE_DIR / 'gnu'


_context: ContextVar[tuple[tuple[str, ...], GNUTranslations]] = ContextVar('TranslationContext')


# removing lru_cache will not enable live-reload for translations
# gettext always caches .mo files internally
@lru_cache(maxsize=256)
def _get_translation(languages: Sequence[str]) -> GNUTranslations:
    """
    Get the translation object for the given languages.
    """
    return translation(
        domain='messages',
        localedir=_locale_dir,
        languages=languages,
    )


@contextmanager
def translation_context(primary_lang: str):
    """
    Context manager for setting the translation in ContextVar.

    Languages order determines the preference, from most to least preferred.
    """

    if primary_lang == DEFAULT_LANGUAGE:
        processed = (primary_lang,)
    elif is_valid_locale(primary_lang):
        processed = (primary_lang, DEFAULT_LANGUAGE)
    else:
        processed = (DEFAULT_LANGUAGE,)

    translation = _get_translation(processed)
    token = _context.set((processed, translation))
    try:
        yield
    finally:
        _context.reset(token)


def translation_languages() -> Sequence[str]:
    """
    Get the languages from the translation context.

    >>> translation_languages()
    ('pl', 'en')
    """
    return _context.get()[0]


def primary_translation_language() -> str:
    """
    Get the primary language from the translation context.

    >>> primary_translation_language()
    'en'
    """
    return _context.get()[0][0]


def t(message: str, **kwargs) -> str:
    """
    Get the translation for the given message.
    """
    trans: GNUTranslations = _context.get()[1]
    translated = trans.gettext(message)
    return translated.format(**kwargs) if len(kwargs) > 0 else translated


def nt(message: str, count: int, **kwargs) -> str:
    """
    Get the translation for the given message, with pluralization.
    """
    trans: GNUTranslations = _context.get()[1]
    translated = trans.ngettext(message, message, count)
    return translated.format(count=count, **kwargs) if len(kwargs) > 0 else translated.format(count=count)
