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

// Chat Management - Using global chats collection
export const createChat = async (userId: string, chatData: Omit<Chat, 'createdAt' | 'updatedAt'>) => {
  try {
    const chatsRef = collection(db, 'chats');
    const chatRef = doc(chatsRef);
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

export const getChat = async (userId: string, chatId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (chatSnap.exists()) {
      const chatData = chatSnap.data();
      // Check if user is a member of this chat
      if (chatData?.members?.includes(userId)) {
        return { success: true, chat: { id: chatSnap.id, ...chatData } };
      } else {
        return { success: false, error: 'Access denied' };
      }
    } else {
      return { success: false, error: 'Chat not found' };
    }
  } catch (error) {
    console.error('Error fetching chat:', error);
    return { success: false, error };
  }
};

export const updateChat = async (userId: string, chatId: string, updates: Partial<Chat>) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      return { success: false, error: 'Chat not found' };
    }
    
    const chatData = chatSnap.data();
    // Check if user is a member of this chat
    if (!chatData?.members?.includes(userId)) {
      return { success: false, error: 'Access denied' };
    }
    
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

export const deleteChat = async (userId: string, chatId: string) => {
  try {
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      return { success: false, error: 'Chat not found' };
    }
    
    const chatData = chatSnap.data();
    // Only the creator can delete the chat
    if (chatData?.createdBy !== userId) {
      return { success: false, error: 'Only the chat creator can delete this chat' };
    }
    
    await deleteDoc(chatRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting chat:', error);
    return { success: false, error };
  }
};

// Get chats for a specific user
export const getUserChats = async (userId: string) => {
  try {
    const chatsRef = collection(db, 'chats');
    const userChatsQuery = query(chatsRef, where('members', 'array-contains', userId));
    const querySnapshot = await getDocs(userChatsQuery);
    
    const chats: Array<Chat & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat & { id: string });
    });
    
    // Sort client-side by updatedAt/createdAt
    chats.sort((a, b) => {
      const aTime = a.updatedAt?.toDate?.() || a.createdAt.toDate();
      const bTime = b.updatedAt?.toDate?.() || b.createdAt.toDate();
      return bTime.getTime() - aTime.getTime();
    });
    
    return { success: true, chats };
  } catch (error) {
    console.error('Error fetching user chats:', error);
    return { success: false, error };
  }
};

// Get chats by PRO - using global chats collection
export const getChatsByPro = async (proId: string) => {
  try {
    const chatsRef = collection(db, 'chats');
    const proChatsQuery = query(chatsRef, where('proId', '==', proId));
    const querySnapshot = await getDocs(proChatsQuery);
    
    const chats: Array<Chat & { id: string }> = [];
    querySnapshot.forEach((doc) => {
      chats.push({ id: doc.id, ...doc.data() } as Chat & { id: string });
    });
    
    // Sort by last message time (newest first)
    chats.sort((a, b) => {
      const aTime = a.lastMessage?.at?.toDate?.()?.getTime() || a.updatedAt?.toDate?.()?.getTime() || 0;
      const bTime = b.lastMessage?.at?.toDate?.()?.getTime() || b.updatedAt?.toDate?.()?.getTime() || 0;
      return bTime - aTime;
    });
    
    return { success: true, chats };
  } catch (error) {
    console.error('Error fetching chats by PRO:', error);
    return { success: false, error };
  }
};

// Get chats by participant - similar limitation
export const getChatsByParticipant = async (participantUid: string) => {
  try {
    // This now becomes getUserChats for the participant
    return await getUserChats(participantUid);
  } catch (error) {
    console.error('Error fetching chats by participant:', error);
    return { success: false, error };
  }
};

// Message Management - Using messages subcollection under chats
export const sendMessage = async (userId: string, messageData: Omit<Message, 'createdAt'>) => {
  try {
    // First verify user has access to this chat
    const chatRef = doc(db, 'chats', messageData.chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      return { success: false, error: 'Chat not found' };
    }
    
    const chatData = chatSnap.data();
    if (!chatData?.members?.includes(userId)) {
      return { success: false, error: 'Access denied' };
    }
    
    // Add message to chat's messages subcollection
    const messagesRef = collection(db, 'chats', messageData.chatId, 'messages');
    const messageRef = await addDoc(messagesRef, {
      ...messageData,
      createdAt: serverTimestamp(),
    });
    
    // Update chat's lastMessage
    await updateDoc(chatRef, {
      lastMessage: {
        text: messageData.text,
        at: serverTimestamp(),
        by: messageData.by,
      },
      updatedAt: serverTimestamp(),
    });
    
    return { success: true, messageId: messageRef.id };
  } catch (error) {
    console.error('Error sending message:', error);
    return { success: false, error };
  }
};

export const getMessages = async (userId: string, chatId: string, limitCount = 50, lastDoc?: QueryDocumentSnapshot) => {
  try {
    // First verify user has access to this chat
    const chatRef = doc(db, 'chats', chatId);
    const chatSnap = await getDoc(chatRef);
    
    if (!chatSnap.exists()) {
      return { success: false, error: 'Chat not found' };
    }
    
    const chatData = chatSnap.data();
    if (!chatData?.members?.includes(userId)) {
      return { success: false, error: 'Access denied' };
    }
    
    const messagesRef = collection(db, 'chats', chatId, 'messages');
    let q = query(
      messagesRef,
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    
    if (lastDoc) {
      q = query(q, startAfter(lastDoc));
    }
    
    const querySnapshot = await getDocs(q);
    const messages: Array<Message & { id: string }> = [];
    
    querySnapshot.forEach((doc) => {
      messages.push({ id: doc.id, ...doc.data() } as Message & { id: string });
    });
    
    // Return in chronological order (oldest first) for display
    messages.reverse();
    
    return { 
      success: true, 
      messages, 
      lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] 
    };
  } catch (error) {
    console.error('Error fetching messages:', error);
    return { success: false, error };
  }
};

export const updateMessage = async (userId: string, chatId: string, messageId: string, updates: Partial<Message>) => {
  try {
    const messageRef = doc(db, 'users', userId, 'chats', chatId, 'messages', messageId);
    await updateDoc(messageRef, updates);
    return { success: true };
  } catch (error) {
    console.error('Error updating message:', error);
    return { success: false, error };
  }
};

export const deleteMessage = async (userId: string, chatId: string, messageId: string) => {
  try {
    const messageRef = doc(db, 'users', userId, 'chats', chatId, 'messages', messageId);
    await deleteDoc(messageRef);
    return { success: true };
  } catch (error) {
    console.error('Error deleting message:', error);
    return { success: false, error };
  }
};

// Create or get existing chat between users - needs redesign for subcollections
export const getOrCreateChat = async (userId: string, proId: string, participants: string[]) => {
  try {
    // For subcollections, we'll create the chat in the user's subcollection
    // and potentially duplicate it in other participants' subcollections if needed
    const userChatsRef = collection(db, 'users', userId, 'chats');
    
    // For now, just create a new chat - finding existing ones across subcollections
    // would require a more complex approach
    const newChat = {
      proId,
      participants: participants.sort(),
      members: participants, // keeping both for compatibility
      title: `Chat with ${participants.join(', ')}`,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    
    const chatRef = await addDoc(userChatsRef, newChat);
    return { success: true, chat: { id: chatRef.id, ...newChat }, isNew: true };
  } catch (error) {
    console.error('Error getting or creating chat:', error);
    return { success: false, error };
  }
}; 