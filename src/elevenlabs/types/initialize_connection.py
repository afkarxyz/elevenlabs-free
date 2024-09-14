# This file was auto-generated by Fern from our API Definition.

from ..core.unchecked_base_model import UncheckedBaseModel
import typing
import pydantic
from .realtime_voice_settings import RealtimeVoiceSettings
from .generation_config import GenerationConfig
from ..core.pydantic_utilities import IS_PYDANTIC_V2


class InitializeConnection(UncheckedBaseModel):
    text: typing.Literal[" "] = pydantic.Field(default=" ")
    """
    The initial text that must be sent is a blank space.
    """

    voice_settings: typing.Optional[RealtimeVoiceSettings] = None
    generation_config: typing.Optional[GenerationConfig] = pydantic.Field(default=None)
    """
    This property should only be provided in the first message you send.
    """

    xi_api_key: str = pydantic.Field(alias="xi-api-key")
    """
    Your ElevenLabs API key. This is a required parameter that should be provided in the first message you send.
    You can find your API key in the [API Keys section](https://elevenlabs.io/docs/api-reference/websockets#api-keys).
    """

    if IS_PYDANTIC_V2:
        model_config: typing.ClassVar[pydantic.ConfigDict] = pydantic.ConfigDict(extra="allow", frozen=True)  # type: ignore # Pydantic v2
    else:

        class Config:
            frozen = True
            smart_union = True
            extra = pydantic.Extra.allow
