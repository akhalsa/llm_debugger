# llm_logger/__init__.py

from llm_logger.wrappers.openai_wrapper import wrap_openai
from llm_logger.wrappers.anthropic_wrapper import wrap_anthropic  # stub for later

__all__ = ["wrap_openai", "wrap_anthropic"]
