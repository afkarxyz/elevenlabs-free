# This file was auto-generated by Fern from our API Definition.

import datetime as dt
import typing

from ..core.datetime_utils import serialize_datetime
from .finetuning_state import FinetuningState
from .manual_verification_response import ManualVerificationResponse
from .verification_attempt_response import VerificationAttemptResponse

try:
    import pydantic.v1 as pydantic  # type: ignore
except ImportError:
    import pydantic  # type: ignore


class FineTuningResponse(pydantic.BaseModel):
    is_allowed_to_fine_tune: typing.Optional[bool] = None
    finetuning_state: typing.Optional[FinetuningState] = None
    verification_failures: typing.Optional[typing.List[str]] = None
    verification_attempts_count: typing.Optional[int] = None
    manual_verification_requested: typing.Optional[bool] = None
    language: typing.Optional[str] = None
    finetuning_progress: typing.Optional[typing.Dict[str, float]] = None
    message: typing.Optional[str] = None
    dataset_duration_seconds: typing.Optional[float] = None
    verification_attempts: typing.Optional[typing.List[VerificationAttemptResponse]] = None
    slice_ids: typing.Optional[typing.List[str]] = None
    manual_verification: typing.Optional[ManualVerificationResponse] = None

    def json(self, **kwargs: typing.Any) -> str:
        kwargs_with_defaults: typing.Any = {"by_alias": True, "exclude_unset": True, **kwargs}
        return super().json(**kwargs_with_defaults)

    def dict(self, **kwargs: typing.Any) -> typing.Dict[str, typing.Any]:
        kwargs_with_defaults: typing.Any = {"by_alias": True, "exclude_unset": True, **kwargs}
        return super().dict(**kwargs_with_defaults)

    class Config:
        frozen = True
        smart_union = True
        extra = pydantic.Extra.allow
        json_encoders = {dt.datetime: serialize_datetime}
