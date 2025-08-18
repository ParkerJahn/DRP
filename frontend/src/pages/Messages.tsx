import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import type { Chat, Message } from '../types';

// Mock timestamp for development
const createMockTimestamp = (date: Date) => ({
  toDate: () => date,
  toMillis: () => date.getTime(),
  seconds: Math.floor(date.getTime() / 1000),
  nanoseconds: 0,
  isEqual: () => false,
  toJSON: () => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0, type: 'timestamp' })
});

const Messages: React.FC = () => {
  const { user } = useAuth();
  const [chats, setChats] = useState<Chat[]>([]);
  const [selectedChat, setSelectedChat] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isCreatingChat, setIsCreatingChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Load user's chats
    loadChats();
  }, [user]);

  const loadChats = async () => {
    // TODO: Implement chat loading from Firestore
    setLoading(false);
    // Mock data for now
    const mockChat = {
      proId: user?.proId || '',
      createdBy: user?.uid || '',
      lastMessage: {
        text: 'Welcome to the team!',
        at: { toDate: () => new Date() },
        by: user?.uid || ''
      },
      members: [user?.uid || ''],
      createdAt: { toDate: () => new Date() }
    } as Chat;
    setChats([mockChat]);
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedChat) return;

    // TODO: Implement message sending to Firestore
    console.log('Sending message:', newMessage);
    
    const message: Message = {
      chatId: selectedChat.proId,
      by: user?.uid || '',
      text: newMessage,
      createdAt: new Date() as any
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');
  };

  const canCreateChat = user?.role === 'PRO' || user?.role === 'STAFF';

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
                Loading chats...
              </div>
            ) : chats.length === 0 ? (
              <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                No chats yet
                {canCreateChat && (
                  <button
                    onClick={() => setIsCreatingChat(true)}
                    className="block mt-2 text-indigo-600 hover:text-indigo-700"
                  >
                    Start your first chat
                  </button>
                )}
              </div>
            ) : (
              chats.map((chat, index) => (
                <div
                  key={index}
                  onClick={() => setSelectedChat(chat)}
                  className={`p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-neutral-700 transition-colors ${
                    selectedChat === chat ? 'bg-indigo-50 dark:bg-indigo-900' : ''
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        Team Chat
                      </p>
                      {chat.lastMessage && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {chat.lastMessage.text}
                        </p>
                      )}
                    </div>
                    {chat.lastMessage && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
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
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Team Chat</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {selectedChat.members.length} members
                </p>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 dark:text-gray-400 py-8">
                    No messages yet. Start the conversation!
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div
                      key={index}
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
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Send
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
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Chat Modal */}
      {isCreatingChat && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-neutral-800 rounded-lg p-6 w-96 max-w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Create New Chat
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              This feature will allow you to create team chats and invite members.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingChat(false)}
                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setIsCreatingChat(false)}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Coming Soon
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages; 