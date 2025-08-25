import { 
  doc, 
  getDoc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  collection, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  limit,
  startAfter,
  QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from '../config/firebase';
import type { Chat, Message } from '../types';

// Chat Management
export const createChat = async (chatData: Omit<Chat, 'createdAt' | 'updatedAt'>) => {
  try {
    const chatRef = doc(collection(db, 'chats'));
    const newChat = {
      ...chatData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    await setDoc(chatRef, newChat);
    return { success: true, chatId: chatRef.id, chat: newChat };
  } catch (error) {
    console.error('Error creating chat:', error);
    return { success: false, error };
  }
};

export const getChat = async (chatId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      return { success: true, chat: { id: chatSnap.id, ...chatSnap.data() } };
    } else {
      return { success: false, error: 'Chat not found' };
    }
  } catch (error) {
    console.error('Error fetching chat:', error);
    return { success: false, error };
  }
};

export const updateChat = async (chatId: string, updates: Partial<Chat>) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await updateDoc(chatRef, {
      ...updates,
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating chat:', error);
    return { success: false, error };
  }
};

export const deleteChat = async (chatId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    await deleteDoc(chatRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting chat:', error);
    return { success: false, error };
  }
};

// Get chats by PRO
export const getChatsByPro = async (proId: string) => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('proId', '==', proId)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const chats: Array<Chat & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat & { id: string });
    });
    
    // Sort client-side instead
    chats.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || a.createdAt.toDate();
      const bTime = b.updatedAt?.toDate?.() || b.createdAt.toDate();
      return bTime.getTime() - aTime.getTime();
    });
    
    return { success: true, chats };
  } catch (error) {
    console.error('Error fetching chats by PRO:', error);
    return { success: false, error };
  }
};

// Get chats by participant
export const getChatsByParticipant = async (participantUid: string) => {
  try {
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('members', 'array-contains', participantUid)
      // Removed orderBy to avoid composite index requirement
    );
    const querySnapshot = await getDocs(q);
    
    const chats: Array<Chat & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat & { id: string });
    });
    
    // Sort client-side instead
    chats.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || a.createdAt.toDate();
      const bTime = b.updatedAt?.toDate?.() || b.createdAt.toDate();
      return bTime.getTime() - aTime.getTime();
    });
    
    return { success: true, chats };
  } catch (error) {
    console.error('Error fetching chats by participant:', error);
    return { success: false, error };
  }
};

// Message Management
export const sendMessage = async (messageData: Omit<Message, 'createdAt'>) => {
  try {
    // Store messages as subcollection of chats for better security
    const messageRef = await addDoc(collection(db, 'chats', messageData.chatId, 'messages'), {
      ...messageData,
      createdAt: serverTimestamp(),
    });
    
    // Update chat's lastMessage and updatedAt
    const chatRef = doc(db, 'chats', messageData.chatId);
    await updateDoc(chatRef, {
      lastMessage: {
        text: messageData.text,
        at: serverTimestamp(),
        by: messageData.by
      },
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, messageId: messageRef.id };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
};

export const getMessagesByChat = async (chatId: string, messageLimit: number = 50, startAfterDoc?: QueryDocumentSnapshot) => {
  try {
    let q = query(
      collection(db, 'chats', chatId, 'messages'),
      orderBy('createdAt', 'desc'),
      limit(messageLimit)
    );
    
    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }
    
    const messagesSnapshot = await getDocs(q);
    const messages: Array<Message & { id: string }> = [];
    
    messagesSnapshot.forEach(doc => {
      const data = doc.data();
      messages.push({
        id: doc.id,
        chatId: data.chatId,
        by: data.by,
        text: data.text,
        createdAt: data.createdAt
      } as Message & { id: string });
    });
    
    return { 
      success: true, 
      messages: messages.reverse(), // Show oldest first
      hasMore: messagesSnapshot.docs.length === messageLimit,
      lastDoc: messagesSnapshot.docs[messagesSnapshot.docs.length - 1]
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error };
  }
};

export const deleteMessage = async (messageId: string) => {
  try {
    const messageRef = doc(db, 'messages', messageId);
    await deleteDoc(messageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error };
  }
};

// Create or get existing chat between users
export const getOrCreateChat = async (proId: string, participants: string[]) => {
  try {
    // Check if chat already exists
    const chatsRef = collection(db, 'chats');
    const q = query(
      chatsRef, 
      where('proId', '==', proId),
      where('participants', '==', participants.sort())
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      const existingChat = querySnapshot.docs[0];
      return { success: true, chat: { id: existingChat.id, ...existingChat.data() }, isNew: false };
    }
    
    // Create new chat
    const newChat = {
      proId,
      participants: participants.sort(),
      title: `Chat with ${participants.join(', ')}`,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const chatRef = await addDoc(collection(db, 'chats'), newChat);
    return { success: true, chat: { id: chatRef.id, ...newChat }, isNew: true };
  } catch (error) {
    console.error('Error getting or creating chat:', error);
    return { success: false, error };
  }
}; 