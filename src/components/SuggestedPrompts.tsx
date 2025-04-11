import React from 'react';

interface SuggestedPromptsProps {
  prompts: string[];
  onPromptClick: (prompt: string) => void;
  className?: string;
}

/**
 * Componente che mostra una lista di prompt suggeriti
 * che l'utente può cliccare per inserirli velocemente nella chat
 */
export const SuggestedPrompts: React.FC<SuggestedPromptsProps> = ({
  prompts,
  onPromptClick,
  className = ''
}) => {
  if (!prompts || prompts.length === 0) {
    return null;
  }
  
  return (
    <div className={`suggested-prompts ${className}`}>
      {prompts.map((prompt, index) => (
        <button 
          key={index} 
          className="suggestion-btn"
          onClick={() => onPromptClick(prompt)}
          aria-label={`Suggerimento: ${prompt}`}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};

/**
 * Versione con animazione di entrata
 */
export const AnimatedSuggestedPrompts: React.FC<SuggestedPromptsProps> = (props) => {
  const [isVisible, setIsVisible] = React.useState(false);
  
  // Aggiungi un effetto di entrata ritardata
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(true);
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);
  
  return (
    <div className={`suggested-prompts ${props.className} ${isVisible ? 'visible' : 'hidden'}`}>
      {props.prompts.map((prompt, index) => (
        <button 
          key={index} 
          className="suggestion-btn"
          style={{ 
            animationDelay: `${index * 100}ms`,
            opacity: isVisible ? 1 : 0,
            transform: isVisible ? 'translateY(0)' : 'translateY(10px)',
            transition: 'opacity 0.3s ease, transform 0.3s ease'
          }}
          onClick={() => props.onPromptClick(prompt)}
          aria-label={`Suggerimento: ${prompt}`}
        >
          {prompt}
        </button>
      ))}
    </div>
  );
};

export default SuggestedPrompts;