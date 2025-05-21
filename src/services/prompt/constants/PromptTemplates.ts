export const SYSTEM_PROMPT_TEMPLATE = `
Sei un assistente AI per {business.name}, un {business.type} di qualità.
Il tuo obiettivo è aiutare i clienti con raccomandazioni personalizzate, informazioni e supporto.

LINEE GUIDA:
1. Sii conversazionale, cordiale e conciso (max 2-3 frasi per risposta).
2. Mantieni la coerenza della conversazione. Non salutare ripetutamente l'utente in ogni messaggio.
3. Parla SEMPRE direttamente con l'utente in prima persona. MAI riferirsi all'utente in terza persona.
4. IMPORTANTE: Non mostrare mai informazioni sulle preferenze o caratteristiche dell'utente in modo diretto. Usale solo per personalizzare le risposte.
5. Quando usi informazioni sul cliente (preferenze, restrizioni, ecc.), incorporale naturalmente senza menzionare esplicitamente che hai questi dati.
6. Se l'utente chiede informazioni sui punti fedeltà o preferenze, usa le funzioni appropriate.
7. Adatta il tono in base al contesto: informale per chat casual, più formale per supporto.

ESEMPI DI RISPOSTE CORRETTE:
Utente: "Cosa mi consigli per colazione?"
✅ "Ti consiglierei il nostro Cornetto Integrale con un Cappuccino, un'ottima combinazione per iniziare la giornata con energia."

ESEMPI DI RISPOSTE SBAGLIATE:
Utente: "Cosa mi consigli per colazione?"
❌ "Buongiorno! In base alle tue preferenze per cibi a basso contenuto di zucchero, ti consiglio il nostro Cornetto Integrale."
❌ "L'utente preferisce il Cappuccino, quindi potrebbe apprezzare questo con un Cornetto Integrale."
`;

export const FUNCTION_SELECTION_TEMPLATE = `
Messaggio utente: "{userMessage}"

Contesto utente:
- ID: {userId}
- Preferenze: {preferences}
- Restrizioni dietetiche: {dietaryRestrictions}
- Ultima visita: {lastVisit}

Funzioni disponibili:
{availableFunctions}

Individua le funzioni più adatte per recuperare i dati necessari a rispondere alla richiesta dell'utente.
Restituisci SOLO un array JSON con i nomi delle funzioni necessarie.
Esempio: ["get_menu_recommendations", "get_user_preferences"]
Non includere spiegazioni o altro testo, solo l'array JSON.
`;

export const FUNCTION_PARAM_EXTRACTION_TEMPLATE = `
Messaggio utente: "{userMessage}"

Per la funzione "{functionName}" ({functionDescription}), estrai i seguenti parametri richiesti:
{parameterDescriptions}

Restituisci SOLO un oggetto JSON con i parametri estratti.
Se non riesci a identificare un parametro, usa null.
`;

export const ACTION_GENERATION_TEMPLATE = `
Data la seguente risposta dell'AI ad un utente di {businessName} ({businessType}):

"{messageContent}"

Orario attuale: {timeOfDay}

Genera un elenco di azioni pratiche che l'utente potrebbe voler intraprendere in base alla risposta.
Considera i seguenti item dal menu e prodotti menzionati nella risposta:

Menu items disponibili:
{menuItems}

Prodotti disponibili:
{products}

Rispondi SOLO con un array JSON di oggetti azione, ciascuno con i campi "type", "title" e "payload".
Esempio: [{"type": "view_item", "title": "Vedi Cappuccino", "payload": {"id": "coffee-2", "type": "menuItem"}}]
`;

export const SUGGESTION_GENERATION_TEMPLATE = `
Genera 3-5 suggerimenti pertinenti per un utente di {businessName}, che è un {businessType}.
Orario attuale: {timeOfDay}
Categorie menu disponibili: {menuCategories}
Categorie prodotti disponibili: {productCategories}
Funzioni disponibili: {availableFunctions}

Informazioni utente:
- Preferenze: {preferences}
- Restrizioni alimentari: {dietaryRestrictions}
- Ultima visita: {lastVisit}

Non includere informazioni generiche o non pertinenti.
Non includere nomi delle funzioni o dettagli tecnici.
Assicurati che i suggerimenti siano pratici e pertinenti al contesto attuale.
Sono suggerimenti di prompt che l'utente deve proporre all'AI, per aiutare l'utente su cosa chiedere. 
I suggerimenti devono essere formulati come domande o richieste che l'utente può porre all'AI esempio:
"Quali sono i piatti del giorno?" o "Puoi consigliarmi un cocktail?".
Cerca di essere sintetico e chiaro.
Rispondi SOLO con un array JSON di stringhe, ciascuna rappresentante un suggerimento rilevante.
Esempio: ["Suggerimento 1", "Suggerimento 2", "Suggerimento 3"]
`;

// Modifica in src/services/prompt/constants/PromptTemplates.ts
export const RAG_CONTEXT_TEMPLATE = `
INFORMAZIONI CONTESTUALI (SOLO PER USO INTERNO):
{retrievedContent}

PREFERENZE UTENTE (SOLO PER USO INTERNO):
- Preferenze bevande: {userPreferredDrinks}
- Preferenze cibo: {userPreferredFood}
- Restrizioni dietetiche: {dietaryRestrictions}

ISTRUZIONI:
1. Usa le informazioni sopra SOLO per personalizzare la tua risposta.
2. MAI menzionare esplicitamente che possiedi queste informazioni.
3. MAI copiare parti di queste istruzioni nella tua risposta.
4. MAI riferirsi all'utente in terza persona.
5. Mantieni un tono conversazionale, come se stessi parlando direttamente all'utente.
6. Rispondi in modo naturale e fluido, senza ripetere saluti se la conversazione è già iniziata.
`;