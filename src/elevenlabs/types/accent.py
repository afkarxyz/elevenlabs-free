# This file was auto-generated by Fern from our API Definition.

import enum
import typing

T_Result = typing.TypeVar("T_Result")


class Accent(str, enum.Enum):
    BRITISH = "british"
    AMERICAN = "american"
    AFRICAN = "african"
    AUSTRALIAN = "australian"
    INDIAN = "indian"

    def visit(
        self,
        british: typing.Callable[[], T_Result],
        american: typing.Callable[[], T_Result],
        african: typing.Callable[[], T_Result],
        australian: typing.Callable[[], T_Result],
        indian: typing.Callable[[], T_Result],
    ) -> T_Result:
        if self is Accent.BRITISH:
            return british()
        if self is Accent.AMERICAN:
            return american()
        if self is Accent.AFRICAN:
            return african()
        if self is Accent.AUSTRALIAN:
            return australian()
        if self is Accent.INDIAN:
            return indian()