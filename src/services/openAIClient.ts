/**
 * Client per interagire con le API di OpenAI
 */
export class OpenAIClient {
    private readonly apiKey: string;
    private readonly baseUrl: string = 'https://api.openai.com/v1';
    
    constructor(apiKey: string) {
      this.apiKey = apiKey;
    }
    
    /**
     * Crea una richiesta di completamento chat
     */
    public async createChatCompletion(params: any): Promise<any> {
      const endpoint = '/chat/completions';
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      };
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Errore API OpenAI: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        return await response.json();
      } catch (error) {
        console.error('Errore nella richiesta a OpenAI:', error);
        throw error;
      }
    }
    
    /**
     * Crea uno stream di completamento chat
     */
    public async createChatCompletionStream(
      messages: any[],
      options: any,
      callback: (chunk: string) => void
    ): Promise<void> {
      const endpoint = '/chat/completions';
      const url = `${this.baseUrl}${endpoint}`;
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
        'Accept': 'text/event-stream'
      };
      
      const params = {
        model: options.model || 'gpt-4',
        messages,
        temperature: options.temperature || 0.7,
        max_tokens: options.maxTokens || 1000,
        stream: true
      };
      
      try {
        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(params)
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(`Errore API OpenAI: ${response.status} - ${JSON.stringify(errorData)}`);
        }
        
        // Gestione dello stream
        if (!response.body) {
          throw new Error('ReadableStream non supportato');
        }
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        // Funzione ricorsiva per leggere i chunk dello stream
        const processStream = async (): Promise<void> => {
          const { done, value } = await reader.read();
          
          if (done) {
            return;
          }
          
          // Decodifica il chunk
          const chunk = decoder.decode(value, { stream: true });
          
          // Elabora il chunk della risposta in formato SSE
          const lines = chunk
            .split('\n')
            .filter(line => line.startsWith('data: ') && line !== 'data: [DONE]');
          
          for (const line of lines) {
            try {
              const jsonData = JSON.parse(line.substring(6)); // Rimuovi 'data: '
              
              if (jsonData.choices && jsonData.choices.length > 0) {
                const content = jsonData.choices[0].delta?.content || '';
                if (content) {
                  callback(content);
                }
              }
            } catch (e) {
              console.warn('Errore nel parsing del chunk dello stream:', e);
            }
          }
          
          // Continua a processare lo stream
          return processStream();
        };
        
        await processStream();
      } catch (error) {
        console.error('Errore nello streaming da OpenAI:', error);
        throw error;
      }
    }
  }