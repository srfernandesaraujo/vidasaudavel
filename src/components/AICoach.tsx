import React, { useState, useRef, useEffect } from 'react';
import { askAICoach, type ChatMessage } from '../utils/aiEngine';
import { Send, Bot, User, RefreshCw, Sparkles } from 'lucide-react';
import './Styles/aicoach.css';

export const AICoach: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: `Olá! Sou o seu **Treinador IA de Saúde e Exercício**. 🏋️‍♂️🏃‍♂️

Estou aqui para te orientar nos treinos de força, dar dicas de pace de corrida, sugerir rotinas personalizadas e tirar dúvidas sobre como melhorar seu rendimento e acelerar a recuperação muscular.

*Como posso ajudar na sua jornada esportiva hoje?*`
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend: string) => {
    if (!textToSend.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      // Exclui a mensagem de boas-vindas inicial para economizar tokens e focar no contexto do chat ativo
      const apiHistory = messages.filter((_, idx) => idx > 0);
      const responseText = await askAICoach(textToSend, apiHistory);
      
      setMessages(prev => [...prev, { role: 'assistant', content: responseText }]);
    } catch (error: any) {
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: `⚠️ **Erro:** Não consegui processar a resposta. Detalhes: ${error.message}` 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(input);
  };

  const clearChat = () => {
    if (window.confirm('Limpar histórico da conversa?')) {
      setMessages([
        {
          role: 'assistant',
          content: 'Olá de novo! Histórico limpo. Como posso ajudar com seus treinos de hoje?'
        }
      ]);
    }
  };

  // Parser simples de Markdown para HTML básico para exibir negritos, listas e quebras de linha de forma premium
  const renderMarkdown = (text: string) => {
    return text.split('\n').map((line, index) => {
      let content = line;
      
      // Converte **negrito**
      const boldRegex = /\*\*(.*?)\*\*/g;
      content = content.replace(boldRegex, '<strong>$1</strong>');

      // Converte *itálico*
      const italicRegex = /\*(.*?)\*/g;
      content = content.replace(italicRegex, '<em>$1</em>');

      // Converte marcadores de lista
      if (line.trim().startsWith('- ')) {
        const listText = content.replace(/^-\s+/, '');
        return <li key={index} style={{ marginLeft: '1.25rem', marginBottom: '0.25rem' }} dangerouslySetInnerHTML={{ __html: listText }} />;
      }
      
      if (line.trim().startsWith('1. ') || line.trim().startsWith('2. ') || line.trim().startsWith('3. ') || line.trim().startsWith('4. ') || line.trim().startsWith('5. ')) {
        const listText = content.replace(/^\d+\.\s+/, '');
        const number = content.match(/^\d+/)?.[0] || '1';
        return <div key={index} style={{ marginLeft: '1.25rem', marginBottom: '0.25rem' }}><strong>{number}.</strong> <span dangerouslySetInnerHTML={{ __html: listText }} /></div>;
      }

      // Se a linha estiver vazia, renderiza uma quebra de linha
      if (!line.trim()) {
        return <div key={index} style={{ height: '0.75rem' }} />;
      }

      return <p key={index} style={{ marginBottom: '0.4rem' }} dangerouslySetInnerHTML={{ __html: content }} />;
    });
  };

  const suggestions = [
    'Como melhorar meu pace nos 5km?',
    'Sugerir aquecimento completo para treino de pernas',
    'Quais exames laboratoriais devo fazer?',
    'Explique o que é a gordura visceral'
  ];

  return (
    <div className="chat-wrapper">
      <header className="flex-between" style={{ marginBottom: '1.25rem' }}>
        <div style={{ textAlign: 'left' }}>
          <h1 style={{ fontSize: '2.25rem', background: 'linear-gradient(135deg, #ffffff, #8b92b6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Bot size={28} color="var(--accent-purple)" />
            Treinador Particular IA
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>Instruções de treino, dúvidas biomecânicas e orientações esportivas.</p>
        </div>

        <button className="btn btn-secondary" style={{ padding: '0.5rem 0.75rem', fontSize: '0.8rem' }} onClick={clearChat}>
          <RefreshCw size={12} />
          Limpar Conversa
        </button>
      </header>

      {/* Caixa de Mensagens */}
      <div className="chat-messages-container">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chat-message-bubble ${msg.role}`}>
            <div className="chat-message-sender" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              {msg.role === 'user' ? (
                <>
                  <User size={12} />
                  <span>Você</span>
                </>
              ) : (
                <>
                  <Bot size={12} color="var(--accent-purple)" />
                  <span>Treinador IA</span>
                </>
              )}
            </div>
            <div>
              {renderMarkdown(msg.content)}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="typing-indicator">
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
            <span className="typing-dot"></span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Sugestões Rápidas */}
      <div className="chat-suggested-prompts-grid">
        {suggestions.map((sug, idx) => (
          <button 
            key={idx}
            className="suggested-prompt-btn"
            onClick={() => handleSendMessage(sug)}
            disabled={isLoading}
          >
            <Sparkles size={10} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
            {sug}
          </button>
        ))}
      </div>

      {/* Input de Envio */}
      <form onSubmit={handleFormSubmit} className="chat-input-box">
        <input
          type="text"
          className="form-control"
          style={{ flex: 1, padding: '0.85rem 1.2rem', borderRadius: 'var(--radius-md)' }}
          placeholder="Pergunte sobre cargas, pace, dores, fisiologia ou nutrição..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
          required
        />
        <button type="submit" className="btn btn-primary" style={{ width: '50px', height: '50px', padding: 0 }} disabled={isLoading}>
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};
