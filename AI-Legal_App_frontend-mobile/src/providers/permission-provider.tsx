/**
 * AI LEGAL™ Permission Provider & Hook
 * Manages contextual pre-permission explainer and blocked settings modals across all app features.
 */

import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { PermissionType, PermissionService } from '../services/permission.service';
import { PermissionModal } from '../components/ui/PermissionModal';

interface PermissionContextType {
  requestPermissionFlow: (type: PermissionType) => Promise<boolean>;
}

const PermissionContext = createContext<PermissionContextType>({
  requestPermissionFlow: async () => false,
});

export const PermissionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [modalState, setModalState] = useState<{
    visible: boolean;
    type: PermissionType;
    mode: 'explainer' | 'blocked';
  }>({
    visible: false,
    type: 'camera',
    mode: 'explainer',
  });

  const resolverRef = useRef<((granted: boolean) => void) | null>(null);

  const requestPermissionFlow = useCallback(async (type: PermissionType): Promise<boolean> => {
    // 1. Check current native permission status
    const checkRes = await PermissionService.checkPermission(type);

    if (checkRes.granted) {
      return true;
    }

    // 2. Determine if blocked / permanently denied
    if (checkRes.status === 'blocked' || (!checkRes.granted && checkRes.canAskAgain === false)) {
      return new Promise<boolean>((resolve) => {
        resolverRef.current = resolve;
        setModalState({
          visible: true,
          type,
          mode: 'blocked',
        });
      });
    }

    // 3. Undetermined or requestable -> Show Pre-permission Explainer ("Continue")
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setModalState({
        visible: true,
        type,
        mode: 'explainer',
      });
    });
  }, []);

  const handleContinue = async () => {
    const currentType = modalState.type;
    setModalState((prev) => ({ ...prev, visible: false }));

    // Trigger native system permission request immediately after user taps "Continue"
    const res = await PermissionService.requestPermission(currentType);

    if (res.granted) {
      resolverRef.current?.(true);
    } else {
      resolverRef.current?.(false);
    }
    resolverRef.current = null;
  };

  const handleCancel = () => {
    setModalState((prev) => ({ ...prev, visible: false }));
    resolverRef.current?.(false);
    resolverRef.current = null;
  };

  const handleOpenSettings = () => {
    setModalState((prev) => ({ ...prev, visible: false }));
    PermissionService.openAppSettings();
    resolverRef.current?.(false);
    resolverRef.current = null;
  };

  return (
    <PermissionContext.Provider value={{ requestPermissionFlow }}>
      {children}
      <PermissionModal
        visible={modalState.visible}
        type={modalState.type}
        mode={modalState.mode}
        onContinue={handleContinue}
        onCancel={handleCancel}
        onOpenSettings={handleOpenSettings}
      />
    </PermissionContext.Provider>
  );
};

export const usePermissionFlow = () => {
  const context = useContext(PermissionContext);
  if (!context || typeof context.requestPermissionFlow !== 'function') {
    return {
      requestPermissionFlow: async (type: PermissionType) => {
        const res = await PermissionService.requestPermission(type);
        return res.granted;
      },
    };
  }
  return context;
};
