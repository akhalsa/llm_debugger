# llm_logger/wrappers/openai_wrapper.py

from datetime import datetime
from llm_logger.logger import log_call

def wrap_openai(client, logging_account_id: str):
    original_create = client.chat.completions.create

    def wrapped_create(*args, **kwargs):
        request_start_timestamp = datetime.now().astimezone().isoformat()
        session_id = kwargs.pop("session_id", None)
        response = original_create(*args, **kwargs)
        request_end_timestamp = datetime.now().astimezone().isoformat()

        log_call(
            provider="openai",
            args=args,
            kwargs=kwargs,
            response=response,
            request_start_timestamp=request_start_timestamp,
            request_end_timestamp=request_end_timestamp,
            logging_account_id=logging_account_id,
            session_id=session_id
        )

        return response

    client.chat.completions.create = wrapped_create
    return client
