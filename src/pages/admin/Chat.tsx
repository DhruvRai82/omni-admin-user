import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Send } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface Message {
  id: string;
  message: string;
  sender_id: string;
  receiver_id: string | null;
  created_at: string;
  sender?: {
    email: string;
    full_name: string | null;
  };
}

interface UserChat {
  user_id: string;
  user_email: string;
  user_name: string | null;
  last_message: string;
  last_message_time: string;
}

export default function Chat() {
  const [userChats, setUserChats] = useState<UserChat[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    fetchUserChats();
  }, []);

  useEffect(() => {
    if (selectedUserId) {
      fetchMessages(selectedUserId);
      subscribeToMessages();
    }
  }, [selectedUserId]);

  const fetchUserChats = async () => {
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, full_name')
        .neq('id', user?.id);

      if (profiles) {
        const chatsWithLastMessage = await Promise.all(
          profiles.map(async (profile) => {
            const { data: lastMsg } = await supabase
              .from('chat_messages')
              .select('message, created_at')
              .or(`sender_id.eq.${profile.id},receiver_id.eq.${profile.id}`)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            return {
              user_id: profile.id,
              user_email: profile.email,
              user_name: profile.full_name,
              last_message: lastMsg?.message || 'No messages yet',
              last_message_time: lastMsg?.created_at || '',
            };
          })
        );

        setUserChats(chatsWithLastMessage);
      }
    } catch (error: any) {
      toast({
        title: 'Error loading chats',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const fetchMessages = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .or(`and(sender_id.eq.${user?.id},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${user?.id})`)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error: any) {
      toast({
        title: 'Error loading messages',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel('chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
        },
        (payload) => {
          if (selectedUserId) {
            fetchMessages(selectedUserId);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedUserId) return;

    try {
      const { error } = await supabase.from('chat_messages').insert({
        sender_id: user?.id,
        receiver_id: selectedUserId,
        message: newMessage,
        is_admin_message: true,
      });

      if (error) throw error;

      setNewMessage('');
      fetchMessages(selectedUserId);
    } catch (error: any) {
      toast({
        title: 'Error sending message',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Chat Management</h1>
        <p className="text-muted-foreground">View and respond to all user chats</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Card className="col-span-1">
          <CardHeader>
            <CardTitle>Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[600px]">
              {userChats.map((chat) => (
                <div
                  key={chat.user_id}
                  className={`cursor-pointer border-b border-border p-4 hover:bg-accent ${
                    selectedUserId === chat.user_id ? 'bg-accent' : ''
                  }`}
                  onClick={() => setSelectedUserId(chat.user_id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarFallback>
                        {(chat.user_name || chat.user_email).charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{chat.user_name || chat.user_email}</p>
                      <p className="text-sm text-muted-foreground truncate">
                        {chat.last_message}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>
              {selectedUserId
                ? userChats.find((c) => c.user_id === selectedUserId)?.user_name ||
                  userChats.find((c) => c.user_id === selectedUserId)?.user_email
                : 'Select a user'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${
                      msg.sender_id === user?.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-[70%] rounded-lg p-3 ${
                        msg.sender_id === user?.id
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm">{msg.message}</p>
                      <p className="mt-1 text-xs opacity-70">
                        {new Date(msg.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {selectedUserId && (
              <div className="mt-4 flex gap-2">
                <Input
                  placeholder="Type a message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                />
                <Button onClick={sendMessage}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}