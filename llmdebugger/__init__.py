# llmdebugger/__init__.py

from llmdebugger.wrappers.openai_wrapper import wrap_openai
from llmdebugger.wrappers.anthropic_wrapper import wrap_anthropic  # stub for later

__all__ = ["wrap_openai", "wrap_anthropic"]
