/**
 * AI Legal Mobile - Providers Composer
 * Combines Theme, Auth, Network, Toast, BottomSheet, and Safe Area providers in a clean nest.
 */

import React from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { ThemeProvider } from './theme-provider';
import { AuthProvider } from './auth-provider';
import { NetworkProvider } from './network-provider';
import { ToastProvider } from './toast-provider';
import { BottomSheetProvider } from './bottom-sheet-provider';
import { WorkspaceProvider } from './workspace.provider';
import { AppUpdateProvider } from './app-update-provider';
import { PermissionProvider } from './permission-provider';

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <GestureHandlerRootView style={styles.container}>
      <SafeAreaProvider>
        <ThemeProvider>
          <AuthProvider>
            <NetworkProvider>
              <ToastProvider>
                <BottomSheetProvider>
                  <WorkspaceProvider>
                    <AppUpdateProvider>
                      <PermissionProvider>{children}</PermissionProvider>
                    </AppUpdateProvider>
                  </WorkspaceProvider>
                </BottomSheetProvider>
              </ToastProvider>
            </NetworkProvider>
          </AuthProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export { useThemeContext } from './theme-provider';
export { useAuthContext } from './auth-provider';
export { useNetworkContext } from './network-provider';
export { useToastContext } from './toast-provider';
export { useBottomSheetContext } from './bottom-sheet-provider';
export { useWorkspaceContext, TeamMember, TeamStats } from './workspace.provider';
export { useAppUpdate, AppUpdateProvider } from './app-update-provider';
export { usePermissionFlow, PermissionProvider } from './permission-provider';
