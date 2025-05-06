// src/services/firebase/FirebaseStorageService.ts

import { collection, doc, getDoc, getDocs, setDoc, query, where, Timestamp, Query, DocumentData } from 'firebase/firestore';
import { IStorageService } from '../../analytics/interfaces/IStorageService';
import { ConversationRecord } from '../../analytics/types';
import { db } from './config';


export class FirebaseStorageService implements IStorageService {
  private conversationsCollection = collection(db, 'conversations');
  
  async saveConversation(record: ConversationRecord): Promise<void> {
    try {
      // Prepara il documento con timestamp Firestore
      const firestoreRecord = this.convertToFirestoreFormat(record);
      
      // Salva il documento
      await setDoc(doc(this.conversationsCollection, record.id), firestoreRecord);
      console.log(`Conversazione ${record.id} salvata correttamente`);
    } catch (error) {
      console.error('Errore nel salvataggio conversazione su Firebase:', error);
      
      // Fallback su localStorage per garantire il funzionamento offline
      this.saveToLocalStorage(record);
    }
  }
  
  async getConversation(id: string): Promise<ConversationRecord | null> {
    try {
      const docRef = doc(this.conversationsCollection, id);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return this.convertFromFirestoreFormat(docSnap.id, docSnap.data());
      }
      
      // Prova a recuperare da localStorage se non trovato
      return this.getFromLocalStorage(id);
    } catch (error) {
      console.error('Errore nel recupero conversazione da Firebase:', error);
      
      // Fallback su localStorage
      return this.getFromLocalStorage(id);
    }
  }
  
  async getAllConversations(userId?: string): Promise<ConversationRecord[]> {
    try {
      let q: Query<DocumentData> = this.conversationsCollection;
      
      // Se è specificato un userId, filtra per esso
      if (userId) {
        q = query(this.conversationsCollection, where("userId", "==", userId));
      }
      
      const querySnapshot = await getDocs(q as any);
      const conversations: ConversationRecord[] = [];
      
      querySnapshot.forEach((doc) => {
        conversations.push(this.convertFromFirestoreFormat(doc.id, doc.data()));
      });
      
      return conversations;
    } catch (error) {
      console.error('Errore nel recupero conversazioni da Firebase:', error);
      
      // Fallback su localStorage
      return this.getAllFromLocalStorage();
    }
  }
  
  async cleanOldConversations(olderThanDays: number = 30): Promise<void> {
    // Implementazione per pulizia dati vecchi
    // (Per brevità non implementata qui, ma può essere aggiunta facilmente)
  }

  // Metodi privati di utilità
  private convertToFirestoreFormat(record: ConversationRecord): any {
    return {
      ...record,
      startTime: Timestamp.fromDate(new Date(record.startTime)),
      endTime: record.endTime ? Timestamp.fromDate(new Date(record.endTime)) : null,
      messages: record.messages.map(msg => ({
        ...msg,
        timestamp: Timestamp.fromMillis(msg.timestamp)
      })),
      lastUpdated: Timestamp.now()
    };
  }

  private convertFromFirestoreFormat(id: string, data: any): ConversationRecord {
    return {
      ...data,
      id,
      startTime: (data.startTime as Timestamp).toDate(),
      endTime: data.endTime ? (data.endTime as Timestamp).toDate() : undefined,
      messages: data.messages.map((msg: any) => ({
        ...msg,
        timestamp: (msg.timestamp as Timestamp).toMillis()
      }))
    } as ConversationRecord;
  }
  
  // Metodi di fallback per localStorage
  private saveToLocalStorage(record: ConversationRecord): void {
    try {
      const key = 'conversation_records';
      const existingData = localStorage.getItem(key);
      const records = existingData ? JSON.parse(existingData) : [];
      
      // Aggiorna o aggiunge
      const index = records.findIndex((r: any) => r.id === record.id);
      if (index >= 0) {
        records[index] = record;
      } else {
        records.push(record);
      }
      
      localStorage.setItem(key, JSON.stringify(records));
    } catch (error) {
      console.error('Fallback localStorage fallito:', error);
    }
  }
  
  private getFromLocalStorage(id: string): ConversationRecord | null {
    try {
      const key = 'conversation_records';
      const existingData = localStorage.getItem(key);
      if (!existingData) return null;
      
      const records = JSON.parse(existingData);
      return records.find((r: any) => r.id === id) || null;
    } catch (error) {
      console.error('Errore nel recupero da localStorage:', error);
      return null;
    }
  }
  
  private getAllFromLocalStorage(): ConversationRecord[] {
    try {
      const key = 'conversation_records';
      const existingData = localStorage.getItem(key);
      return existingData ? JSON.parse(existingData) : [];
    } catch (error) {
      console.error('Errore nel recupero da localStorage:', error);
      return [];
    }
  }
}