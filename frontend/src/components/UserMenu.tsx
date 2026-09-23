import React from 'react';
import { Box, Avatar, Menu, MenuItem, Typography, Button, Divider } from '@mui/material';
import { Person as PersonIcon, Logout as LogoutIcon } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

export const UserMenu: React.FC = () => {
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  
  const userInfo = localStorage.getItem('user_info');
  const user = userInfo ? JSON.parse(userInfo) : null;
  
  const handleLogout = () => {
    localStorage.removeItem('user_token');
    localStorage.removeItem('user_info');
    window.location.reload();
  };

  if (!user) {
    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<PersonIcon />}
        onClick={() => navigate('/login')}
        sx={{
          bgcolor: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        Войти
      </Button>
    );
  }

  return (
    <Box>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        startIcon={
          <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
            <PersonIcon sx={{ fontSize: 14 }} />
          </Avatar>
        }
        sx={{
          bgcolor: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(8px)',
        }}
      >
        {user.username}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem disabled>
          <Typography variant="caption">
            Роль: <strong>{user.role || 'user'}</strong>
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <LogoutIcon sx={{ mr: 1, fontSize: 18 }} />
          Выйти
        </MenuItem>
      </Menu>
    </Box>
  );
};