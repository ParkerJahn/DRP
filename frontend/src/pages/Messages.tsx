import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { 
  createChat, 
  getChatsByPro, 
  getChatsByParticipant, 
  sendMessage, 
  getMessagesByChat,
  deleteChat
} from '../services/messages';
import { getUsersByRole } from '../services/firebase';
import type { Chat, Message, User } from '../types';
import { Timestamp } from 'firebase/firestore';

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<(Chat & { id: string })[]>([]);
  const [selectedChat, setSelectedChat] = useState<(Chat & { id: string }) | null>(null);
  const [messages, setMessages] = useState<(Message & { id: string })[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState<User[]>([]);
  const [chatForm, setChatForm] = useState({
    title: '',
    members: [] as string[]
  });
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadChats();
      loadTeamMembers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedChat) {
      loadMessages(selectedChat.id);
    }
  }, [selectedChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadChats = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      let result;
      
      if (user.role === 'ATHLETE') {
        // Athletes see chats they're members of
        result = await getChatsByParticipant(user.uid);
      } else {
        // PRO and Staff see all team chats
        result = await getChatsByPro(user.proId || user.uid);
      }
      
      if (result.success) {
        setChats(result.chats || []);
        // Select first chat if available
        if (result.chats && result.chats.length > 0 && !selectedChat) {
          setSelectedChat(result.chats[0]);
        }
      } else {
        console.error('Failed to load chats:', result.error);
      }
    } catch (error) {
      console.error('Error loading chats:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTeamMembers = async () => {
    if (!user || (user.role !== 'PRO' && user.role !== 'STAFF')) return;
    
    try {
      // Get both staff and athletes for the team
      const staffResult = await getUsersByRole(user.proId || user.uid, 'STAFF');
      const athleteResult = await getUsersByRole(user.proId || user.uid, 'ATHLETE');
      
      const allMembers = [
        ...(staffResult.success ? staffResult.users || [] : []),
        ...(athleteResult.success ? athleteResult.users || [] : [])
      ];
      
      setTeamMembers(allMembers);
    } catch (error) {
      console.error('Error loading team members:', error);
    }
  };

  const loadMessages = async (chatId: string) => {
    if (!chatId) return;
    
    try {
      const result = await getMessagesByChat(chatId);
      if (result.success) {
        setMessages(result.messages || []);
      } else {
        console.error('Failed to load messages:', result.error);
      }
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const handleCreateChat = async () => {
    if (!user || !chatForm.title || chatForm.members.length === 0) return;
    
    try {
      const chatData = {
        proId: user.proId || user.uid,
        createdBy: user.uid,
        members: [user.uid, ...chatForm.members], // Include creator
        title: chatForm.title
      };
      
      const result = await createChat(chatData);
      if (result.success) {
        await loadChats();
        setChatForm({ title: '', members: [] });
        setIsCreatingChat(false);
        
        // Select the new chat
        if (result.chatId && result.chat) {
          const newChat = { 
            id: result.chatId, 
            ...result.chat,
            createdAt: result.chat.createdAt || Timestamp.now(),
            updatedAt: result.chat.updatedAt || Timestamp.now()
          } as Chat & { id: string };
          setSelectedChat(newChat);
        }
      } else {
        alert('Failed to create chat');
      }
    } catch (error) {
      console.error('Error creating chat:', error);
      alert('Error creating chat');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat || sendingMessage) return;

    try {
      setSendingMessage(true);
      const messageData = {
        chatId: selectedChat.id,
        by: user!.uid,
        text: newMessage.trim()
      };
      
      const result = await sendMessage(messageData);
      if (result.success) {
        // Add message to local state immediately for optimistic UI
        const newMessageObj: Message & { id: string } = {
          id: result.messageId || '',
          chatId: selectedChat.id,
          by: user!.uid,
          text: newMessage.trim(),
          createdAt: Timestamp.now()
        };
        
        setMessages(prev => [...prev, newMessageObj]);
        setNewMessage('');
        
        // Update chat's lastMessage
        const updatedChat = {
          ...selectedChat,
          lastMessage: {
            text: newMessage.trim(),
            at: Timestamp.now(),
            by: user!.uid
          }
        };
        setSelectedChat(updatedChat);
        
        // Update chat in chats list
        setChats(prev => prev.map(chat => 
          chat.id === selectedChat.id ? updatedChat : chat
        ));
      } else {
        alert('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      alert('Error sending message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleDeleteChat = async (chatId: string) => {
    if (!confirm('Are you sure you want to delete this chat? This action cannot be undone.')) return;
    
    try {
      const result = await deleteChat(chatId);
      if (result.success) {
        if (selectedChat?.id === chatId) {
          setSelectedChat(null);
          setMessages([]);
        }
        await loadChats();
      } else {
        alert('Failed to delete chat');
      }
    } catch (error) {
      console.error('Error deleting chat:', error);
      alert('Error deleting chat');
    }
  };

  const canCreateChat = user?.role === 'PRO' || user?.role === 'STAFF';
  const canDeleteChat = user?.role === 'PRO' || user?.role === 'STAFF';

  const getChatTitle = (chat: Chat & { id: string }) => {
    if (chat.title && chat.title.trim()) return chat.title;
    
    // Generate title from members if no custom title
    const memberNames = teamMembers
      .filter(member => chat.members.includes(member.uid))
      .map(member => member.displayName || member.firstName)
      .filter(Boolean);
    
    if (memberNames.length > 0) {
      return memberNames.length === 1 ? memberNames[0] : `${memberNames[0]} & ${memberNames.length - 1} others`;
    }
    
    return 'Team Chat';
  };

  const getMemberNames = (chat: Chat & { id: string }) => {
    return teamMembers
      .filter(member => chat.members.includes(member.uid))
      .map(member => member.displayName || `${member.firstName} ${member.lastName}`)
      .filter(Boolean);
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-200px)]">
      <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg h-full flex">
        {/* Chat List Sidebar */}
        <div className="w-80 border-r border-gray-200 dark:border-gray-700 flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h2>
              {canCreateChat && (
                <button
                  onClick={() => setIsCreatingChat(true)}
                  className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  title="Create New Chat"
                >
                  <span className="text-lg">+</span>
                </button>
              )}
            </div>
          </div>

          {/* Chat List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600 mx-auto mb-2"></div>
                Loading chats...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                <div className="text-4xl mb-2">💬</div>
                <p className="mb-2">No chats yet</p>
                {canCreateChat && (
                  <button
                    onClick={() => setIsCreatingChat(true)}
                    className="text-indigo-600 hover:text-indigo-700 font-medium"
                  >
                    Start your first chat
                  </button>
                )}
              </div>
            ) : (
              chats.map((chat) => (
                <div
                  key={chat.id}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors ${
                    selectedChat?.id === chat.id ? 'bg-indigo-50 dark:bg-indigo-900' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                          {getChatTitle(chat)}
                        </p>
                        {canDeleteChat && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChat(chat.id);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs ml-2"
                            title="Delete Chat"
                          >
                            🗑️
                          </button>
                        )}
                      </div>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {chat.lastMessage.text}
                        </p>
                      )}
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {chat.members.length} member{chat.members.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                        {new Date(chat.lastMessage.at.toDate()).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col">
          {selectedChat ? (
            <>
              {/* Chat Header */}
              <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {getChatTitle(selectedChat)}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {getMemberNames(selectedChat).join(', ')}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 dark:text-gray-500">
                    {selectedChat.members.length} member{selectedChat.members.length !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    <div className="text-4xl mb-2">💬</div>
                    <p>No messages yet. Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.by === user.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                          message.by === user.uid
                            ? 'bg-indigo-600 text-white'
                            : 'bg-gray-200 dark:bg-neutral-700 text-gray-900 dark:text-white'
                        }`}
                      >
                        <p className="text-sm">{message.text}</p>
                        <p className="text-xs mt-1 opacity-70">
                          {new Date(message.createdAt.toDate()).toLocaleTimeString([], { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder="Type your message..."
                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent dark:bg-neutral-700 dark:text-white"
                    disabled={sendingMessage}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendingMessage}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {sendingMessage ? 'Sending...' : 'Send'}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-gray-500 dark:text-gray-400">
                <div className="text-6xl mb-4">💬</div>
                <h3 className="text-xl font-semibold mb-2">Select a chat</h3>
                <p>Choose a conversation from the sidebar to start messaging</p>
                {canCreateChat && (
                  <button
                    onClick={() => setIsCreatingChat(true)}
                    className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                  >
                    Create New Chat
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Modal */}
      {isCreatingChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 max-w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Chat
            </h3>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleCreateChat();
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Chat Title *
                </label>
                <input
                  type="text"
                  value={chatForm.title}
                  onChange={(e) => setChatForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="e.g., Team Training, Staff Meeting"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Add Members *
                </label>
                <select
                  multiple
                  value={chatForm.members}
                  onChange={(e) => {
                    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
                    setChatForm(prev => ({ ...prev, members: selectedOptions }));
                  }}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  required
                >
                  {teamMembers.map((member) => (
                    <option key={member.uid} value={member.uid}>
                      {member.displayName || `${member.firstName} ${member.lastName}`} ({member.role})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple members</p>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsCreatingChat(false);
                    setChatForm({ title: '', members: [] });
                  }}
                  className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!chatForm.title || chatForm.members.length === 0}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Create Chat
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages; 