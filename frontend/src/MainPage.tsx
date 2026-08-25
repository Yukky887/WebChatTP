import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Typography, IconButton, Drawer, List, ListItem,
  ListItemIcon, ListItemText, Divider, Tooltip,
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

const SIDEBAR_WIDTH = 280;

const MainPage: React.FC = () => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      bgcolor: '#f7f7f8',
      overflow: 'hidden',
    }}>
      {/* Сайдбар */}
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
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AIIcon color="primary" />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>Parts AI</Typography>
            <IconButton onClick={() => setSidebarOpen(false)} size="small" sx={{ ml: 'auto' }}>
              <ChevronLeftIcon />
            </IconButton>
          </Box>
          <Divider />
          <List sx={{ px: 1 }}>
            <ListItem onClick={() => window.location.reload()} sx={{ cursor: 'pointer', borderRadius: 2, mb: 0.5, '&:hover': { bgcolor: '#e0e0e0' } }}>
              <ListItemIcon sx={{ minWidth: 36 }}><AddIcon /></ListItemIcon>
              <ListItemText primary="Новый чат" />
            </ListItem>
            <ListItem sx={{ cursor: 'pointer', borderRadius: 2, mb: 0.5, bgcolor: '#e0e0e0' }}>
              <ListItemIcon sx={{ minWidth: 36 }}><ChatIcon /></ListItemIcon>
              <ListItemText primary="Чат с ассистентом" />
            </ListItem>
            <ListItem onClick={() => navigate('/admin')} sx={{ cursor: 'pointer', borderRadius: 2, mb: 0.5, '&:hover': { bgcolor: '#e0e0e0' } }}>
              <ListItemIcon sx={{ minWidth: 36 }}><SettingsIcon /></ListItemIcon>
              <ListItemText primary="Админ-панель" />
            </ListItem>
          </List>
          <Divider />
          <Box sx={{ mt: 'auto', p: 2 }}>
            <Typography variant="caption" color="text.secondary">Версия 1.0.0</Typography>
          </Box>
        </Box>
      </Drawer>

      {/* Кнопка меню если закрыт */}
      {!sidebarOpen && (
        <IconButton 
          onClick={() => setSidebarOpen(true)}
          sx={{ position: 'absolute', top: 16, left: 16, bgcolor: 'white', boxShadow: 1, zIndex: 10, '&:hover': { bgcolor: '#f5f5f5' } }}
        >
          <MenuIcon />
        </IconButton>
      )}

      {/* Чат */}
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>
        <ChatComponent />
      </Box>
    </Box>
  );
};

export default MainPage;