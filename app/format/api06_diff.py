from collections.abc import Sequence

from app.models.db.element import Element
from app.models.element_ref import ElementRef
from app.models.element_type import ElementType


class Diff06Mixin:
    @staticmethod
    def encode_diff_result(assigned_ref_map: dict[ElementRef, Sequence[Element]]) -> Sequence[tuple[ElementType, dict]]:
        """
        >>> encode_diff_result({
        ...     TypedElementRef(type=ElementType.node, id=-1): [
        ...         Element(type=ElementType.node, id=1, version=1, ...),
        ...         Element(type=ElementType.node, id=1, version=2, ...),
        ...     ],
        ... })
        [
            ('node', {'@old_id': -1, '@new_id': 1, '@new_version': 1}),
            ('node', {'@old_id': -1, '@new_id': 1, '@new_version': 2})
        ]
        """
        result = []

        for element_ref, elements in assigned_ref_map.items():
            type = element_ref.type
            old_id = element_ref.id

            for element in elements:
                result.append(  # noqa: PERF401
                    (
                        type,
                        {
                            '@old_id': old_id,
                            '@new_id': element.id,
                            '@new_version': element.version,
                        },
                    )
                )

        return result
