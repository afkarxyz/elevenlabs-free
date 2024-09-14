# This file was auto-generated by Fern from our API Definition.

from ..core.client_wrapper import SyncClientWrapper
import typing
from ..core.request_options import RequestOptions
from ..core.jsonable_encoder import jsonable_encoder
from ..core.unchecked_base_model import construct_type
from ..errors.unprocessable_entity_error import UnprocessableEntityError
from ..types.http_validation_error import HttpValidationError
from json.decoder import JSONDecodeError
from ..core.api_error import ApiError
from ..core.client_wrapper import AsyncClientWrapper


class SamplesClient:
    def __init__(self, *, client_wrapper: SyncClientWrapper):
        self._client_wrapper = client_wrapper

    def delete(
        self, voice_id: str, sample_id: str, *, request_options: typing.Optional[RequestOptions] = None
    ) -> typing.Optional[typing.Any]:
        """
        Removes a sample by its ID.

        Parameters
        ----------
        voice_id : str
            Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.

        sample_id : str
            Sample ID to be used, you can use GET https://api.elevenlabs.io/v1/voices/{voice_id} to list all the available samples for a voice.

        request_options : typing.Optional[RequestOptions]
            Request-specific configuration.

        Returns
        -------
        typing.Optional[typing.Any]
            Successful Response

        Examples
        --------
        from elevenlabs import ElevenLabs

        client = ElevenLabs(
            api_key="YOUR_API_KEY",
        )
        client.samples.delete(
            voice_id="ja9xsmfGhxYcymxGcOGB",
            sample_id="pMsXgVXv3BLzUgSXRplE",
        )
        """
        _response = self._client_wrapper.httpx_client.request(
            f"v1/voices/{jsonable_encoder(voice_id)}/samples/{jsonable_encoder(sample_id)}",
            method="DELETE",
            request_options=request_options,
        )
        try:
            if 200 <= _response.status_code < 300:
                return typing.cast(
                    typing.Optional[typing.Any],
                    construct_type(
                        type_=typing.Optional[typing.Any],  # type: ignore
                        object_=_response.json(),
                    ),
                )
            if _response.status_code == 422:
                raise UnprocessableEntityError(
                    typing.cast(
                        HttpValidationError,
                        construct_type(
                            type_=HttpValidationError,  # type: ignore
                            object_=_response.json(),
                        ),
                    )
                )
            _response_json = _response.json()
        except JSONDecodeError:
            raise ApiError(status_code=_response.status_code, body=_response.text)
        raise ApiError(status_code=_response.status_code, body=_response_json)

    def get_audio(
        self, voice_id: str, sample_id: str, *, request_options: typing.Optional[RequestOptions] = None
    ) -> typing.Iterator[bytes]:
        """
        Returns the audio corresponding to a sample attached to a voice.

        Parameters
        ----------
        voice_id : str
            Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.

        sample_id : str
            Sample ID to be used, you can use GET https://api.elevenlabs.io/v1/voices/{voice_id} to list all the available samples for a voice.

        request_options : typing.Optional[RequestOptions]
            Request-specific configuration.

        Yields
        ------
        typing.Iterator[bytes]
            Successful Response

        Examples
        --------
        from elevenlabs import ElevenLabs

        client = ElevenLabs(
            api_key="YOUR_API_KEY",
        )
        client.samples.get_audio(
            voice_id="ja9xsmfGhxYcymxGcOGB",
            sample_id="pMsXgVXv3BLzUgSXRplE",
        )
        """
        with self._client_wrapper.httpx_client.stream(
            f"v1/voices/{jsonable_encoder(voice_id)}/samples/{jsonable_encoder(sample_id)}/audio",
            method="GET",
            request_options=request_options,
        ) as _response:
            try:
                if 200 <= _response.status_code < 300:
                    for _chunk in _response.iter_bytes():
                        yield _chunk
                    return
                _response.read()
                if _response.status_code == 422:
                    raise UnprocessableEntityError(
                        typing.cast(
                            HttpValidationError,
                            construct_type(
                                type_=HttpValidationError,  # type: ignore
                                object_=_response.json(),
                            ),
                        )
                    )
                _response_json = _response.json()
            except JSONDecodeError:
                raise ApiError(status_code=_response.status_code, body=_response.text)
            raise ApiError(status_code=_response.status_code, body=_response_json)


class AsyncSamplesClient:
    def __init__(self, *, client_wrapper: AsyncClientWrapper):
        self._client_wrapper = client_wrapper

    async def delete(
        self, voice_id: str, sample_id: str, *, request_options: typing.Optional[RequestOptions] = None
    ) -> typing.Optional[typing.Any]:
        """
        Removes a sample by its ID.

        Parameters
        ----------
        voice_id : str
            Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.

        sample_id : str
            Sample ID to be used, you can use GET https://api.elevenlabs.io/v1/voices/{voice_id} to list all the available samples for a voice.

        request_options : typing.Optional[RequestOptions]
            Request-specific configuration.

        Returns
        -------
        typing.Optional[typing.Any]
            Successful Response

        Examples
        --------
        import asyncio

        from elevenlabs import AsyncElevenLabs

        client = AsyncElevenLabs(
            api_key="YOUR_API_KEY",
        )


        async def main() -> None:
            await client.samples.delete(
                voice_id="ja9xsmfGhxYcymxGcOGB",
                sample_id="pMsXgVXv3BLzUgSXRplE",
            )


        asyncio.run(main())
        """
        _response = await self._client_wrapper.httpx_client.request(
            f"v1/voices/{jsonable_encoder(voice_id)}/samples/{jsonable_encoder(sample_id)}",
            method="DELETE",
            request_options=request_options,
        )
        try:
            if 200 <= _response.status_code < 300:
                return typing.cast(
                    typing.Optional[typing.Any],
                    construct_type(
                        type_=typing.Optional[typing.Any],  # type: ignore
                        object_=_response.json(),
                    ),
                )
            if _response.status_code == 422:
                raise UnprocessableEntityError(
                    typing.cast(
                        HttpValidationError,
                        construct_type(
                            type_=HttpValidationError,  # type: ignore
                            object_=_response.json(),
                        ),
                    )
                )
            _response_json = _response.json()
        except JSONDecodeError:
            raise ApiError(status_code=_response.status_code, body=_response.text)
        raise ApiError(status_code=_response.status_code, body=_response_json)

    async def get_audio(
        self, voice_id: str, sample_id: str, *, request_options: typing.Optional[RequestOptions] = None
    ) -> typing.AsyncIterator[bytes]:
        """
        Returns the audio corresponding to a sample attached to a voice.

        Parameters
        ----------
        voice_id : str
            Voice ID to be used, you can use https://api.elevenlabs.io/v1/voices to list all the available voices.

        sample_id : str
            Sample ID to be used, you can use GET https://api.elevenlabs.io/v1/voices/{voice_id} to list all the available samples for a voice.

        request_options : typing.Optional[RequestOptions]
            Request-specific configuration.

        Yields
        ------
        typing.AsyncIterator[bytes]
            Successful Response

        Examples
        --------
        import asyncio

        from elevenlabs import AsyncElevenLabs

        client = AsyncElevenLabs(
            api_key="YOUR_API_KEY",
        )


        async def main() -> None:
            await client.samples.get_audio(
                voice_id="ja9xsmfGhxYcymxGcOGB",
                sample_id="pMsXgVXv3BLzUgSXRplE",
            )


        asyncio.run(main())
        """
        async with self._client_wrapper.httpx_client.stream(
            f"v1/voices/{jsonable_encoder(voice_id)}/samples/{jsonable_encoder(sample_id)}/audio",
            method="GET",
            request_options=request_options,
        ) as _response:
            try:
                if 200 <= _response.status_code < 300:
                    async for _chunk in _response.aiter_bytes():
                        yield _chunk
                    return
                await _response.aread()
                if _response.status_code == 422:
                    raise UnprocessableEntityError(
                        typing.cast(
                            HttpValidationError,
                            construct_type(
                                type_=HttpValidationError,  # type: ignore
                                object_=_response.json(),
                            ),
                        )
                    )
                _response_json = _response.json()
            except JSONDecodeError:
                raise ApiError(status_code=_response.status_code, body=_response.text)
            raise ApiError(status_code=_response.status_code, body=_response_json)
