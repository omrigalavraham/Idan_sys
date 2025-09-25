import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Leads from '../pages/Leads';
import Tasks from '../pages/Tasks';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import Attendance from '../pages/Attendance';
import Profile from '../pages/Profile';
import Customers from '../pages/Customers';
import Calendar from '../pages/Calendar';
import UserManagement from '../pages/UserManagement';
import ClientManagement from '../pages/ClientManagement';
import Reminders from '../pages/Reminders';
import Dialer from '../pages/Dialer';
import PrivateRoute from '../components/PrivateRoute';
import { useUserStore } from '../store/userStore';
import useAuthStore from '../store/authStore';
import { useClientStore } from '../store/clientStore';

const AppRoutes = () => {
  const { user } = useAuthStore();
  const { currentClient } = useClientStore();
  const userStore = useUserStore();

  const checkFeature = (feature: string) => {
    if (!currentClient) return true; // If no client, allow access
    return currentClient.features[feature as keyof typeof currentClient.features];
  };
  return (
    <Routes>
      <Route path="/" element={<Leads />} />
      
      <Route path="/leads" element={<Leads />} />
      
      <Route 
        path="/tasks" 
        element={
          checkFeature('enableTasks') ? (
            <Tasks />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
      
      <Route 
        path="/calendar" 
        element={
          checkFeature('enableCalendar') ? (
            <Calendar />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
      
      <Route 
        path="/reports" 
        element={
          checkFeature('enableReports') ? (
            <Reports />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
      
      <Route path="/settings" element={<Settings />} />
      <Route path="/attendance" element={<Attendance />} />
      <Route path="/profile" element={<Profile />} />
      <Route path="/reminders" element={<Reminders />} />
      <Route path="/dialer" element={<Dialer />} />
      
      <Route 
        path="/customers" 
        element={
          checkFeature('enableCustomers') ? (
            <Customers />
          ) : (
            <Navigate to="/" replace />
          )
        } 
      />
      
      <Route 
        path="/users" 
        element={
          <PrivateRoute allowedRoles={['admin', 'manager']}>
            <UserManagement />
          </PrivateRoute>
        } 
      />
      
      <Route 
        path="/clients" 
        element={
          <PrivateRoute requiredRole="admin">
            <ClientManagement />
          </PrivateRoute>
        } 
      />
    </Routes>
  );
};

export default AppRoutes;