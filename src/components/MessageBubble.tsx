import React from 'react';
import { Message } from '../types/Message';
import { formatTime } from '../utils/formatters';

interface MessageBubbleProps {
  message: Message;
  isTyping?: boolean;
  className?: string;
  showTechnicalTrace?: boolean;
}

/**
 * Componente che renderizza una bolla di messaggio nella chat
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isTyping = false,
  className = '',
  showTechnicalTrace = false
}) => {
  const isUser = message.role === 'user';
  const bubbleClassName = `message ${isUser ? 'user-message' : 'ai-message'} ${isTyping ? 'typing' : ''} ${className}`;
  
  // Formatta il timestamp in orario
  const formattedTime = formatTime(new Date(message.timestamp));
  
  // Renderizza il messaggio di digitazione
  if (isTyping) {
    return (
      <div className={bubbleClassName}>
        <div className="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    );
  }
  
  // Renderizza un messaggio di funzione
  if (message.role === 'function') {
    return null; // Scegliamo di non mostrare i messaggi di funzione nella chat
  }
  
  // Formatta il contenuto del messaggio con supporto per il markdown di base
  const formatContent = (content: string) => {
    const withoutMarkdownImages = content.replace(/!\[[^\]]*\]\([^)]+\)/g, '');
    // Sostituisce gli URL con link cliccabili
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const contentWithLinks = withoutMarkdownImages.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    
    // Supporto per bold e italic
    const boldItalicRegex = /\*\*\*(.*?)\*\*\*/g;
    const boldRegex = /\*\*(.*?)\*\*/g;
    const italicRegex = /\*(.*?)\*/g;
    
    let formattedContent = contentWithLinks
      .replace(boldItalicRegex, '<strong><em>$1</em></strong>')
      .replace(boldRegex, '<strong>$1</strong>')
      .replace(italicRegex, '<em>$1</em>');
    
    // Supporto per gli a capo
    formattedContent = formattedContent.replace(/\n/g, '<br />');
    
    return formattedContent;
  };
  
  return (
    <div className={bubbleClassName}>
      {!isUser && showTechnicalTrace && message.metadata?.agent && (
        <div className="message-agent-strip">
          <span>{message.metadata.agent.label.replace(' Agent', '')}</span>
          {typeof message.metadata.agent.confidence === 'number' && (
            <small>{Math.round(message.metadata.agent.confidence * 100)}%</small>
          )}
        </div>
      )}
      <div 
        className="message-content"
        dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
      ></div>
      {!isUser && showTechnicalTrace && message.metadata?.trace && message.metadata.trace.length > 0 && (
        <div className="message-trace">
          {message.metadata.trace.map((step, index) => (
            <span key={`${step.label}-${index}`}>
              <b>{step.label}</b> {step.value}
            </span>
          ))}
        </div>
      )}
      <div className="message-time">
        {formattedTime}
      </div>
    </div>
  );
};

/**
 * Versione animata che esegue l'effetto di digitazione per i messaggi dell'assistente
 */
export const AnimatedMessageBubble: React.FC<MessageBubbleProps> = (props) => {
  const { message, className = '' } = props;
  const isUser = message.role === 'user';
  const shouldAnimate = !isUser && message.role !== 'function';
  
  const [displayedContent, setDisplayedContent] = React.useState(
    shouldAnimate ? '' : message.content
  );
  const [isComplete, setIsComplete] = React.useState(!shouldAnimate);
  
  React.useEffect(() => {
    if (!shouldAnimate) {
      setDisplayedContent(message.content);
      setIsComplete(true);
      return;
    }

    if (!message.content) {
      setDisplayedContent('');
      setIsComplete(true);
      return;
    }
    
    let currentIndex = 0;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    const content = message.content;

    setDisplayedContent('');
    setIsComplete(false);
    
    const typeNextCharacter = () => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
        const delay = content[currentIndex] === ' ' ? 20 : 30;
        timeoutId = setTimeout(typeNextCharacter, delay);
      } else {
        setIsComplete(true);
      }
    };
    
    typeNextCharacter();
    
    return () => {
      currentIndex = content.length;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [message.content, shouldAnimate]);
  
  if (!shouldAnimate) {
    return <MessageBubble {...props} />;
  }
  
  const displayMessage: Message = {
    ...message,
    content: displayedContent
  };
  
  return (
    <MessageBubble 
      message={displayMessage} 
      isTyping={!isComplete}
      className={className}
    />
  );
};
export default MessageBubble;
