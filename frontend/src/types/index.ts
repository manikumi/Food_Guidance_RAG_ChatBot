// Types matching the FastAPI backend models

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  refusal_mode?: string | null;
  is_cross_document: boolean;
  documents_used: string[];
  timestamp: string;
}

export interface ChatSession {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
  filter_doc?: string | null;
}

export interface SessionSummary {
  session_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  filter_doc?: string | null;
}

export interface SendMessageRequest {
  content: string;
  filter_doc?: string | null;
}

export interface SendMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  session: {
    session_id: string;
    title: string;
    updated_at: string;
  };
}

export interface EditMessageResponse {
  user_message: ChatMessage;
  assistant_message: ChatMessage;
  messages: ChatMessage[];
}

export interface ShareSession {
  share_id: string;
  title: string;
  created_at: string;
  messages: ChatMessage[];
}
