import React from 'react';
import { Message } from '../types/Message';
import { formatTime } from '../utils/formatters';

interface MessageBubbleProps {
  message: Message;
  isTyping?: boolean;
  className?: string;
}

/**
 * Componente che renderizza una bolla di messaggio nella chat
 */
export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isTyping = false,
  className = ''
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
    // Sostituisce gli URL con link cliccabili
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const contentWithLinks = content.replace(urlRegex, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`);
    
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
      <div 
        className="message-content"
        dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
      ></div>
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
  
  // Se è un messaggio utente o non è un messaggio testuale, usa la versione normale
  if (isUser || message.role === 'function') {
    return <MessageBubble {...props} />;
  }
  
  // Per i messaggi dell'assistente, implementiamo un effetto di digitazione
  const [displayedContent, setDisplayedContent] = React.useState('');
  const [isComplete, setIsComplete] = React.useState(false);
  
  React.useEffect(() => {
    if (!message.content) return;
    
    let currentIndex = 0;
    const content = message.content;
    
    // Funzione che aggiunge una lettera alla volta
    const typeNextCharacter = () => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.slice(0, currentIndex + 1));
        currentIndex++;
        
        // Calcola un ritardo variabile in base al carattere
        const delay = content[currentIndex] === ' ' ? 20 : 30;
        setTimeout(typeNextCharacter, delay);
      } else {
        setIsComplete(true);
      }
    };
    
    // Inizia l'animazione di digitazione
    typeNextCharacter();
    
    // Cleanup
    return () => {
      currentIndex = content.length; // Ferma l'animazione
    };
  }, [message.content]);
  
  // Crea una copia del messaggio con il contenuto parziale
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