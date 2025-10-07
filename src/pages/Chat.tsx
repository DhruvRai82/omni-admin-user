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
    if (isAdmin) {
      fetchUserChats();
    } else {
      // For regular users, automatically set up chat with admin
      fetchMessages(null);
      subscribeToMessages(null);
    }
  }, [isAdmin, user]);

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
    try {
      let query = supabase
        .from('chat_messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (isAdmin && otherUserId) {
        query = query.or(`sender_id.eq.${otherUserId},receiver_id.eq.${otherUserId}`);
      } else if (!isAdmin) {
        query = query.or(`sender_id.eq.${user?.id},receiver_id.eq.${user?.id}`);
      }

      const { data, error } = await query;

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
          if (isAdmin) {
            if (otherUserId && (newMsg.sender_id === otherUserId || newMsg.receiver_id === otherUserId)) {
              setMessages(prev => [...prev, newMsg]);
            }
          } else {
            setMessages(prev => [...prev, newMsg]);
          }
          if (isAdmin) fetchUserChats();
        }
      )
      .subscribe();

    return channel;
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !user) return;

    try {
      const messageData: any = {
        sender_id: user.id,
        message: newMessage.trim(),
        is_admin_message: isAdmin,
      };

      if (isAdmin && selectedUser) {
        messageData.receiver_id = selectedUser.user_id;
      } else if (!isAdmin) {
        // User sends to admin (receiver_id can be null for broadcast to admins)
        messageData.receiver_id = null;
      }

      const { error } = await supabase
        .from('chat_messages')
        .insert([messageData]);

      if (error) throw error;

      setNewMessage('');
      if (isAdmin) fetchUserChats();
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    }
  };

  if (isAdmin && !selectedUser) {
    return (
      <div className="flex h-[calc(100vh-8rem)]">
        <Card className="flex-1 p-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-xl font-semibold">User Conversations</h2>
          </div>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {userChats.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No conversations yet</p>
              ) : (
                userChats.map((chat) => (
                  <div
                    key={chat.user_id}
                    onClick={() => setSelectedUser(chat)}
                    className="flex items-start gap-3 p-3 rounded-lg hover:bg-accent cursor-pointer transition-colors"
                  >
                    <Avatar>
                      <AvatarFallback>{chat.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="font-medium truncate">{chat.full_name}</p>
                        <span className="text-xs text-muted-foreground">
                          {new Date(chat.last_message_time).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{chat.last_message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {isAdmin && (
        <Card className="w-80 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold">Conversations</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedUser(null)}
            >
              Back
            </Button>
          </div>
          <ScrollArea className="h-[calc(100vh-12rem)]">
            <div className="space-y-2">
              {userChats.map((chat) => (
                <div
                  key={chat.user_id}
                  onClick={() => setSelectedUser(chat)}
                  className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.user_id === chat.user_id ? 'bg-accent' : 'hover:bg-accent'
                  }`}
                >
                  <Avatar>
                    <AvatarFallback>{chat.full_name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate text-sm">{chat.full_name}</p>
                    <p className="text-xs text-muted-foreground truncate">{chat.last_message}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </Card>
      )}

      <Card className="flex-1 flex flex-col">
        <div className="p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="text-xl font-semibold">
              {isAdmin && selectedUser ? `Chat with ${selectedUser.full_name}` : 'Chat with Admin'}
            </h2>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No messages yet. Start the conversation!</p>
            ) : (
              messages.map((msg) => {
                const isMine = msg.sender_id === user?.id;
                return (
                  <div key={msg.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] rounded-lg p-3 ${
                      isMine 
                        ? 'bg-primary text-primary-foreground' 
                        : 'bg-muted'
                    }`}>
                      <p className="text-sm">{msg.message}</p>
                      <span className="text-xs opacity-70 mt-1 block">
                        {new Date(msg.created_at).toLocaleTimeString()}
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
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Type your message..."
              className="flex-1"
            />
            <Button onClick={sendMessage} size="icon">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Chat;
