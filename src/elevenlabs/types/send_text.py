# This file was auto-generated by Fern from our API Definition.

from ..core.unchecked_base_model import UncheckedBaseModel
import typing
import pydantic
from ..core.pydantic_utilities import IS_PYDANTIC_V2


class SendText(UncheckedBaseModel):
    text: str
    try_trigger_generation: typing.Optional[bool] = pydantic.Field(default=None)
    """
    This is an advanced setting that most users shouldn't need to use. It relates to our generation schedule
    explained [here](#understanding-how-our-websockets-buffer-text).
    
    Use this to attempt to immediately trigger the generation of audio, overriding the `chunk_length_schedule`.
    Unlike flush, `try_trigger_generation` will only generate audio if our
    buffer contains more than a minimum
    threshold of characters, this is to ensure a higher quality response from our model.
    
    Note that overriding the chunk schedule to generate small amounts of
    text may result in lower quality audio, therefore, only use this parameter if you
    really need text to be processed immediately. We generally recommend keeping the default value of
    `false` and adjusting the `chunk_length_schedule` in the `generation_config` instead.
    """

    if IS_PYDANTIC_V2:
        model_config: typing.ClassVar[pydantic.ConfigDict] = pydantic.ConfigDict(extra="allow", frozen=True)  # type: ignore # Pydantic v2
    else:

        class Config:
            frozen = True
            smart_union = True
            extra = pydantic.Extra.allow
