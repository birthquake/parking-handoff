import React, { useState, useEffect } from 'react';
import { collection, onSnapshot, addDoc, serverTimestamp, doc, getDoc, updateDoc } from 'firebase/firestore';
import { db, COLLECTIONS } from '../../firebase/config';
import { format } from 'date-fns';
import Navigation from '../Navigation/Navigation';

const Messages = ({ user }) => {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Load conversations where user is participant
  useEffect(() => {
    // Simple query to avoid index requirements
    const conversationsQuery = collection(db, COLLECTIONS.MESSAGES);

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      const conversationsData = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        // Filter in JavaScript instead of Firestore query
        if (data.participants && data.participants.includes(user.uid)) {
          // Get the other participant's info
          const otherParticipantId = data.participants.find(id => id !== user.uid);
          let otherParticipant = null;
          
          if (otherParticipantId) {
            try {
              const userDoc = await getDoc(doc(db, COLLECTIONS.USERS, otherParticipantId));
              otherParticipant = userDoc.exists() ? userDoc.data() : null;
            } catch (error) {
              console.error('Error fetching participant info:', error);
            }
          }

          conversationsData.push({
            id: docSnap.id,
            ...data,
            otherParticipant,
            lastMessageAt: data.lastMessageAt?.toDate()
          });
        }
      }

      // Sort by last message time (newest first)
      conversationsData.sort((a, b) => (b.lastMessageAt || 0) - (a.lastMessageAt || 0));

      setConversations(conversationsData);
      setLoading(false);
    }, (error) => {
      console.error('Error loading conversations:', error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user.uid]);

  // Load messages for selected conversation
  useEffect(() => {
    if (!selectedConversation) {
      setMessages([]);
      return;
    }

    const messagesCollectionRef = collection(db, `${COLLECTIONS.MESSAGES}/${selectedConversation.id}/messages`);

    const unsubscribe = onSnapshot(messagesCollectionRef, (snapshot) => {
      const messagesData = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        messagesData.push({
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate()
        });
      });
      
      // Sort by creation time (oldest first)
      messagesData.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
      
      setMessages(messagesData);
    });

    return () => unsubscribe();
  }, [selectedConversation]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setSending(true);
    try {
      // Add message to subcollection
      await addDoc(collection(db, `${COLLECTIONS.MESSAGES}/${selectedConversation.id}/messages`), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email,
        createdAt: serverTimestamp()
      });

      // Update the existing conversation document with last message info
      const conversationRef = doc(db, COLLECTIONS.MESSAGES, selectedConversation.id);
      await updateDoc(conversationRef, {
        lastMessage: newMessage.trim(),
        lastMessageAt: serverTimestamp(),
        lastMessageSender: user.uid
      });

      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation user={user} />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <div className="loading-spinner mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading conversations...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-6">
          <h1 className="text-3xl font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-600">
            Coordinate parking spot handoffs with other users.
          </p>
        </div>

        <div className="bg-white rounded-lg shadow overflow-hidden">
          {/* Mobile: Single column stack */}
          <div className="block md:hidden">
            {!selectedConversation ? (
              /* Conversations List - Mobile */
              <div>
                <div className="p-4 border-b border-gray-200">
                  <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
                </div>
                
                <div className="max-h-96 overflow-y-auto">
                  {conversations.length === 0 ? (
                    <div className="p-4 text-center text-gray-500">
                      <p>No conversations yet.</p>
                      <p className="text-sm mt-1">Messages will appear when you reserve spots.</p>
                    </div>
                  ) : (
                    conversations.map((conversation) => (
                      <div
                        key={conversation.id}
                        onClick={() => setSelectedConversation(conversation)}
                        className="p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900">
                              {conversation.otherParticipant?.name || conversation.otherParticipant?.email || 'Unknown User'}
                            </h3>
                            <p className="text-sm text-gray-600 truncate">
                              {conversation.spotAddress}
                            </p>
                            {conversation.lastMessage && (
                              <p className="text-sm text-gray-500 truncate mt-1">
                                {conversation.lastMessage}
                              </p>
                            )}
                          </div>
                          <span className="text-xs text-gray-400">
                            →
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ) : (
              /* Selected Conversation - Mobile */
              <div className="flex flex-col h-screen max-h-screen">
                {/* Back button and header */}
                <div className="p-4 border-b border-gray-200 flex items-center">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-blue-600 mr-3"
                  >
                    ← Back
                  </button>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.otherParticipant?.name || selectedConversation.otherParticipant?.email || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {selectedConversation.spotAddress}
                    </p>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-64">
                  {messages.length === 0 ? (
                    <div className="text-center text-gray-500">
                      <p>Start the conversation!</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                      >
                        <div
                          className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                            message.senderId === user.uid
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-200 text-gray-900'
                          }`}
                        >
                          <p className="break-words">{message.text}</p>
                          {message.createdAt && (
                            <p className={`text-xs mt-1 ${
                              message.senderId === user.uid ? 'text-blue-100' : 'text-gray-500'
                            }`}>
                              {format(message.createdAt, 'h:mm a')}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Message Input */}
                <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                      disabled={sending}
                    />
                    <button
                      type="submit"
                      disabled={sending || !newMessage.trim()}
                      className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm touch-target"
                    >
                      Send
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Desktop: Side by side layout */}
          <div className="hidden md:flex h-96">
            {/* Conversations List */}
            <div className="w-1/3 border-r border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Conversations</h2>
              </div>
              
              <div className="overflow-y-auto h-full">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500">
                    <p>No conversations yet.</p>
                    <p className="text-sm mt-1">Messages will appear when you reserve spots.</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className={`p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${
                        selectedConversation?.id === conversation.id ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-medium text-gray-900">
                            {conversation.otherParticipant?.name || conversation.otherParticipant?.email || 'Unknown User'}
                          </h3>
                          <p className="text-sm text-gray-600 truncate">
                            {conversation.spotAddress}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {conversation.lastMessage}
                            </p>
                          )}
                        </div>
                        {conversation.lastMessageAt && (
                          <span className="text-xs text-gray-400">
                            {format(conversation.lastMessageAt, 'MMM d')}
                          </span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {selectedConversation ? (
                <>
                  <div className="p-4 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900">
                      {selectedConversation.otherParticipant?.name || selectedConversation.otherParticipant?.email || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-600">
                      Spot: {selectedConversation.spotAddress}
                    </p>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                      <div className="text-center text-gray-500">
                        <p>No messages yet. Start the conversation!</p>
                      </div>
                    ) : (
                      messages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                        >
                          <div
                            className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                              message.senderId === user.uid
                                ? 'bg-blue-600 text-white'
                                : 'bg-gray-200 text-gray-900'
                            }`}
                          >
                            <p className="break-words">{message.text}</p>
                            {message.createdAt && (
                              <p className={`text-xs mt-1 ${
                                message.senderId === user.uid ? 'text-blue-100' : 'text-gray-500'
                              }`}>
                                {format(message.createdAt, 'h:mm a')}
                              </p>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <form onSubmit={sendMessage} className="p-4 border-t border-gray-200">
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        placeholder="Type your message..."
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
                        disabled={sending}
                      />
                      <button
                        type="submit"
                        disabled={sending || !newMessage.trim()}
                        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                      >
                        Send
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-gray-500">
                  <div className="text-center">
                    <p className="text-sm">Select a conversation to start messaging</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Tips */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">💡 Messaging Tips</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Conversations start automatically when you reserve a spot</li>
            <li>• Share your phone number for easier coordination</li>
            <li>• Confirm the exact meeting location and time</li>
            <li>• Be clear about any special instructions (license plate, car color, etc.)</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Messages;
