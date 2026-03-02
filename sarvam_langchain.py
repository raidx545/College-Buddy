from typing import Any, List, Optional
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.messages import BaseMessage, AIMessage, HumanMessage, SystemMessage, ChatMessage
from langchain_core.outputs import ChatResult, ChatGeneration

from sarvamai import SarvamAI

class SarvamChatModel(BaseChatModel):
    api_key: str
    temperature: float = 0.1
    _client: Any = None
    
    def __init__(self, api_key: str, temperature: float = 0.1, **kwargs):
        super().__init__(api_key=api_key, temperature=temperature, **kwargs)
        self._client = SarvamAI(api_subscription_key=api_key)

    @property
    def _llm_type(self) -> str:
        return "sarvam-chat-model"
        
    def _generate(
        self,
        messages: List[BaseMessage],
        stop: Optional[List[str]] = None,
        run_manager: Optional[Any] = None,
        **kwargs: Any,
    ) -> ChatResult:
        sarvam_messages = []
        for m in messages:
            role = "user"
            if isinstance(m, SystemMessage):
                role = "system"
            elif isinstance(m, AIMessage):
                role = "assistant"
            elif isinstance(m, HumanMessage):
                role = "user"
            elif isinstance(m, ChatMessage):
                role = m.role
            sarvam_messages.append({"role": role, "content": m.content})
            
        response = self._client.chat.completions(
            messages=sarvam_messages,
            temperature=self.temperature
        )
        
        message = AIMessage(content=response.choices[0].message.content)
        generation = ChatGeneration(message=message)
        return ChatResult(generations=[generation])
