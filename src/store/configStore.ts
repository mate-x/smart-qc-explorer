import { create } from 'zustand';
import type { PreprocessingConfig, ModelConfig, DeviceInfo } from '../types/config';

interface ConfigState {
  preprocessingConfig: PreprocessingConfig | null;
  modelConfig: ModelConfig | null;
  deviceInfo: DeviceInfo | null;
  setConfigs: (pre: PreprocessingConfig, model: ModelConfig) => void;
  setDeviceInfo: (info: DeviceInfo) => void;
  clearConfigs: () => void;
}

export const useConfigStore = create<ConfigState>((set) => ({
  preprocessingConfig: null,
  modelConfig: null,
  deviceInfo: null,
  setConfigs: (pre, model) => set({ preprocessingConfig: pre, modelConfig: model }),
  setDeviceInfo: (info) => set({ deviceInfo: info }),
  clearConfigs: () => set({ preprocessingConfig: null, modelConfig: null, deviceInfo: null }),
}));
