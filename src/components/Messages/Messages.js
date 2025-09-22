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
    const conversationsQuery = collection(db, COLLECTIONS.MESSAGES);

    const unsubscribe = onSnapshot(conversationsQuery, async (snapshot) => {
      const conversationsData = [];
      
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        
        if (data.participants && data.participants.includes(user.uid)) {
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
      await addDoc(collection(db, `${COLLECTIONS.MESSAGES}/${selectedConversation.id}/messages`), {
        text: newMessage.trim(),
        senderId: user.uid,
        senderName: user.displayName || user.email,
        createdAt: serverTimestamp()
      });

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
        <div className="container py-responsive">
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
      
      <div className="container">
        <div className="py-responsive">
          <h1 className="text-responsive-xl font-bold text-gray-900">Messages</h1>
          <p className="mt-2 text-gray-600 text-sm">
            Coordinate parking spot handoffs with other users.
          </p>
        </div>

        {/* Mobile Layout - Full Screen */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {!selectedConversation ? (
            /* Conversations List - Mobile */
            <div>
              <div className="p-4 border-b border-gray-200">
                <h2 className="font-medium text-gray-900">Your Conversations</h2>
              </div>
              
              <div className="divide-y divide-gray-100">
                {conversations.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <div className="text-4xl mb-4">💬</div>
                    <p className="font-medium">No conversations yet</p>
                    <p className="text-sm mt-1">Messages appear when you reserve spots or someone reserves yours.</p>
                  </div>
                ) : (
                  conversations.map((conversation) => (
                    <div
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation)}
                      className="p-4 cursor-pointer hover:bg-gray-50 active:bg-gray-100"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2">
                            <h3 className="font-medium text-gray-900 truncate">
                              {conversation.otherParticipant?.name || conversation.otherParticipant?.email || 'Unknown User'}
                            </h3>
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          </div>
                          <p className="text-sm text-gray-600 truncate mt-1">
                            📍 {conversation.spotAddress}
                          </p>
                          {conversation.lastMessage && (
                            <p className="text-sm text-gray-500 truncate mt-1">
                              {conversation.lastMessage}
                            </p>
                          )}
                          {conversation.lastMessageAt && (
                            <p className="text-xs text-gray-400 mt-1">
                              {format(conversation.lastMessageAt, 'MMM d, h:mm a')}
                            </p>
                          )}
                        </div>
                        <div className="ml-4 flex-shrink-0">
                          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            /* Selected Conversation - Mobile */
            <div className="h-screen flex flex-col">
              {/* Header */}
              <div className="p-4 border-b border-gray-200 bg-white">
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => setSelectedConversation(null)}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {selectedConversation.otherParticipant?.name || selectedConversation.otherParticipant?.email || 'Unknown User'}
                    </h3>
                    <p className="text-sm text-gray-600 truncate">
                      📍 {selectedConversation.spotAddress}
                    </p>
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50" style={{height: 'calc(100vh - 200px)'}}>
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <div className="text-3xl mb-2">👋</div>
                    <p>Start the conversation!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.senderId === user.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-xs px-4 py-2 rounded-2xl ${
                          message.senderId === user.uid
                            ? 'bg-blue-600 text-white'
                            : 'bg-white text-gray-900 border border-gray-200'
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
              <div className="p-4 bg-white border-t border-gray-200">
                <form onSubmit={sendMessage} className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={sending}
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="w-12 h-12 bg-blue-600 text-white rounded-full hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 flex items-center justify-center"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                      </svg>
                    )}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Tips Section */}
        {!selectedConversation && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">💡 Messaging Tips</h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Conversations start automatically when you reserve a spot</li>
              <li>• Share your phone number for easier coordination</li>
              <li>• Confirm the exact meeting location and time</li>
              <li>• Be clear about any special instructions</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
