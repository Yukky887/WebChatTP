import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Divider,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Menu as MenuIcon,
  ChatBubble as ChatIcon,
  Add as AddIcon,
  Psychology as AIIcon,
  ChevronLeft as ChevronLeftIcon,
} from '@mui/icons-material';
import { ChatComponent } from './components/chat/ChatComponent';
import { useSessions } from './hooks/useSessions';

const SIDEBAR_WIDTH = 280;

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  
  const { sessions, refresh: refreshSessions } = useSessions();

  // Загрузка конкретной сессии
  const handleSessionClick = (sessionId: string) => {
    setCurrentSessionId(sessionId);
    setSidebarOpen(false);
    // Чат-компонент должен увидеть currentSessionId и загрузить сообщения
  };

  // Новый чат
  const handleNewChat = () => {
    setCurrentSessionId(null);
    window.location.reload();
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      bgcolor: '#f7f7f8',
      overflow: 'hidden',
    }}>
      <Drawer
        variant="persistent"
        open={sidebarOpen}
        sx={{
          width: sidebarOpen ? SIDEBAR_WIDTH : 0,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: SIDEBAR_WIDTH,
            bgcolor: '#f0f0f0',
            position: 'relative',
            height: '100%',
            border: 'none',
          },
        }}
      >
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          {/* Заголовок */}
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Parts AI</Typography>
            <IconButton onClick={() => setSidebarOpen(false)} size="small" sx={{ ml: 'auto' }}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
          <Divider />

          {/* Кнопка нового чата */}
          <List sx={{ px: 1 }}>
            <ListItem 
              onClick={handleNewChat} 
              sx={{ 
                cursor: 'pointer', 
                borderRadius: 2, 
                mb: 0.5, 
                '&:hover': { bgcolor: '#e0e0e0' } 
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <AddIcon />
              </ListItemIcon>
              <ListItemText primary="Новый чат" />
            </ListItem>

            {/* История чатов */}
            {sessions.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Typography 
                  variant="caption" 
                  sx={{ px: 2, color: 'text.secondary', display: 'block', mb: 0.5 }}
                >
                  История чатов
                </Typography>
                
                <List dense disablePadding>
                  {sessions.map((session) => (
                    <ListItem
                      key={session.id}
                      onClick={() => handleSessionClick(session.id)}
                      sx={{
                        cursor: 'pointer',
                        borderRadius: 1,
                        mx: 1,
                        mb: 0.5,
                        bgcolor: currentSessionId === session.id ? '#e3f2fd' : 'transparent',
                        '&:hover': { bgcolor: '#e0e0e0' },
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <ChatIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={
                          session.selected_program === 'intellect' 
                            ? '🧠 Intellect' 
                            : session.selected_program === 'resource'
                              ? '🔧 Resource'
                              : '💬 Чат'
                        }
                        secondary={new Date(session.created_at).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                        slotProps={{
                          primary: { variant: 'body2', noWrap: true },
                          secondary: { variant: 'caption' },
                        }}
                      />
                    </ListItem>
                  ))}
                </List>
              </>
            )}

            <Divider sx={{ my: 1 }} />

            {/* Админка */}
            <ListItem 
              onClick={() => navigate('/admin')} 
              sx={{ 
                cursor: 'pointer', 
                borderRadius: 2, 
                mb: 0.5, 
                '&:hover': { bgcolor: '#e0e0e0' } 
              }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Админ-панель" />
            </ListItem>
          </List>

          {/* Версия */}
          <Box sx={{ mt: 'auto', p: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Версия 1.0.0
            </Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Кнопка открытия сайдбара */}
      {!sidebarOpen && (
        <IconButton
          onClick={() => setSidebarOpen(true)}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            bgcolor: 'white',
            boxShadow: 1,
            zIndex: 10,
            '&:hover': { bgcolor: '#f5f5f5' },
          }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Чат */}
      <Box sx={{ 
        flex: 1, 
        display: 'flex', 
        flexDirection: 'column', 
        overflow: 'hidden', 
        minWidth: 0 
      }}>
        <ChatComponent 
          currentSessionId={currentSessionId}
          onSessionChange={() => refreshSessions()}
        />
      </Box>
    </Box>
  );
};

export default MainPage;