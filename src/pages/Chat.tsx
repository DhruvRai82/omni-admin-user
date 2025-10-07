import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Send, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string | null;
  message: string;
  is_admin_message: boolean;
  created_at: string;
}

interface UserChat {
  user_id: string;
  full_name: string;
  email: string;
  last_message: string;
  last_message_time: string;
}

const Chat = () => {
  const { user, userRole } = useAuth();
  const [userChats, setUserChats] = useState<UserChat[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserChat | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const isAdmin = userRole === 'admin';

  useEffect(() => {
    // Both admin and regular users fetch all user chats
    if (user) {
      fetchUserChats();
    }
  }, [user]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages(selectedUser.user_id);
      const subscription = subscribeToMessages(selectedUser.user_id);
      return () => {
        supabase.removeChannel(subscription);
      };
    }
  }, [selectedUser]);

  const fetchUserChats = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) throw profilesError;

      const userChatsData = await Promise.all(
        profiles
          .filter(profile => profile.id !== user?.id)
          .map(async (profile) => {
            const { data: lastMessage } = await supabase
              .from('chat_messages')
              .select('message, created_at')
              .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              user_id: profile.id,
              full_name: profile.full_name || profile.email.split('@')[0],
              email: profile.email,
              last_message: lastMessage?.message || 'No messages yet',
              last_message_time: lastMessage?.created_at || new Date().toISOString(),
            };
          })
      );

      setUserChats(userChatsData.sort((a, b) => 
        new Date(b.last_message_time).getTime() - new Date(a.last_message_time).getTime()
      ));
    } catch (error) {
      console.error('Error fetching user chats:', error);
      toast.error('Failed to load conversations');
    }
  };

  const fetchMessages = async (otherUserId: string | null) => {
    if (!otherUserId || !user) return;
    
    try {
      // Fetch all messages between current user and selected user
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to load messages');
    }
  };

  const subscribeToMessages = (otherUserId: string | null) => {
    const channel = supabase
      .channel('chat_messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          // Update messages if the new message involves current user and selected user
          if (otherUserId && user && 
              ((newMsg.sender_id === user.id && newMsg.receiver_id === otherUserId) ||
               (newMsg.sender_id === otherUserId && newMsg.receiver_id === user.id))) {
            setMessages(prev => [...prev, newMsg]);
          }
          // Refresh user chats list to update last message
          fetchUserChats();
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user || !selectedUser) return;

    try {
      const messageData = {
        sender_id: user.id,
        receiver_id: selectedUser.user_id,
        message: newMessage.trim(),
        is_admin_message: isAdmin,
      };

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData]);

      if (error) throw error;

      setNewMessage('');
      fetchUserChats();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  // Auto-select first user if none selected
  useEffect(() => {
    if (userChats.length > 0 && !selectedUser) {
      setSelectedUser(userChats[0]);
    }
  }, [userChats, selectedUser]);

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Left Sidebar - User List (WhatsApp style) */}
      <Card className="w-80 p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-4 pb-4 border-b">
          <MessageSquare className="h-5 w-5" />
          <h3 className="font-semibold">
            {isAdmin ? 'User Conversations' : 'Chats'}
          </h3>
        </div>
        <ScrollArea className="flex-1">
          <div className="space-y-2">
            {userChats.length === 0 ? (
              <p className="text-muted-foreground text-center py-8 text-sm">
                No conversations yet
              </p>
            ) : (
              userChats.map((chat) => (
                <div
                  key={chat.user_id}
                  onClick={() => setSelectedUser(chat)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.user_id === chat.user_id 
                      ? 'bg-accent' 
                      : 'hover:bg-accent/50'
                  }`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>
                      {chat.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium truncate text-sm">
                        {chat.full_name}
                      </p>
                      <span className="text-xs text-muted-foreground">
                        {new Date(chat.last_message_time).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {chat.last_message}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Right Side - Chat Messages (WhatsApp style) */}
      <Card className="flex-1 flex flex-col">
        {selectedUser ? (
          <>
            <div className="p-4 border-b bg-muted/30">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {selectedUser.full_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h2 className="font-semibold">{selectedUser.full_name}</h2>
                  <p className="text-xs text-muted-foreground">{selectedUser.email}</p>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No messages yet. Start the conversation!
                  </p>
                ) : (
                  messages.map((msg) => {
                    const isMine = msg.sender_id === user?.id;
                    return (
                      <div 
                        key={msg.id} 
                        className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}
                      >
                        <div 
                          className={`max-w-[70%] rounded-lg p-3 ${
                            isMine 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-muted'
                          }`}
                        >
                          <p className="text-sm break-words">{msg.message}</p>
                          <span className="text-xs opacity-70 mt-1 block">
                            {new Date(msg.created_at).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </ScrollArea>

            <div className="p-4 border-t">
              <div className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button 
                  onClick={sendMessage} 
                  size="icon"
                  disabled={!newMessage.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <MessageSquare className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-medium">Select a conversation</p>
              <p className="text-sm">Choose a chat from the list to start messaging</p>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default Chat;
