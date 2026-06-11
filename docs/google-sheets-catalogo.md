# Catalogo da Google Sheets

CafeConnect AI puo leggere menu e prodotti da un Google Sheet pubblicato come CSV.

## Preparazione

1. Scarica i template da **Impostazioni Business > Catalogo**.
2. Carica il CSV in Google Sheets oppure copia le colonne in un nuovo foglio.
3. Compila le righe del menu o dei prodotti.
4. Da Google Sheets scegli **File > Condividi > Pubblica sul web**.
5. Pubblica il foglio in formato CSV.
6. Incolla il link nel pannello catalogo.

Puoi incollare anche un link Google Sheet normale, ad esempio:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit#gid=0
```

L'app lo converte automaticamente in:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/export?format=csv&gid=0
```

## Colonne menu consigliate

- `id`
- `name`
- `category`
- `subcategory`
- `timeOfDay`
- `price`
- `description`
- `ingredients`
- `allergens`
- `dietaryInfo`
- `imageUrl`
- `popularity`

Per campi multipli usa `|`, `,` o `;`, ad esempio:

```text
morning|afternoon
glutine|lattosio
vegan|gluten-free
```

## Colonne prodotti consigliate

- `id`
- `name`
- `category`
- `price`
- `description`
- `details`
- `imageUrl`
- `inStock`
- `popularity`

La colonna `details` puo contenere JSON, ad esempio:

```json
{"weight":"250g","form":"grani","origin":["Etiopia","Colombia"]}
```

## Note operative

- Lascia attivo **Usa dati locali** per la demo.
- Disattiva **Usa dati locali** quando vuoi usare endpoint o Google Sheets.
- Dopo il salvataggio, l'app ricarica i servizi e aggiorna catalogo, chat e dashboard.
