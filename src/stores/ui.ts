import { defineStore } from 'pinia';

interface UiState {
  sidebarCollapsed: boolean;
}

export const useUiStore = defineStore('ui', {
  state: (): UiState => ({
    sidebarCollapsed: false,
  }),
  actions: {
    toggleSidebar() {
      this.sidebarCollapsed = !this.sidebarCollapsed;
    },
  },
});
